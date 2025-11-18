import frappe
from frappe import _


@frappe.whitelist(allow_guest=True)
def mobile_app_login(usr, app_password, device_id):
	"""
	Authenticate user for mobile app with username and app password

	Args:
		usr: Username/Email of the user
		app_password: App password set in Employee record
		device_id: Unique device identifier from mobile app

	Returns:
		dict: Authentication result with user details or error message
	"""
	try:
		print(f"Mobile login attempt for user: {usr}")

		# Step 1: Check if user exists
		if not frappe.db.exists("User", usr):
			return {
				"success": False,
				"message": _("User does not exist")
			}

		# Step 2: Get employee record linked to this user
		# Note: Don't fetch password field with get_value - it won't work for Password field type
		employee = frappe.db.get_value(
			"Employee",
			{"user_id": usr},
			["name", "employee_name", "allow_ess", "device_id", "device_registered_on"],
			as_dict=True
		)

		if not employee:
			return {
				"success": False,
				"message": _("No employee record found for this user")
			}

		print(f"Employee found: {employee.name}")

		# Step 3: Check if ESS is allowed
		if not employee.allow_ess:
			return {
				"success": False,
				"message": _("Employee Self Service is not enabled for this account")
			}

		# Step 4: Verify app password
		# Get employee document to access password field
		employee_doc = frappe.get_doc("Employee", employee.name)

		# Retrieve password using get_password method (required for Password field type)
		stored_password = employee_doc.get_password("app_password")

		if not stored_password:
			return {
				"success": False,
				"message": _("App password not set. Please contact administrator")
			}

		if stored_password != app_password:
			return {
				"success": False,
				"message": _("Invalid app password")
			}

		# Step 5: Handle device ID binding
		print(f"Client Device ID: {device_id}")
		print(f"Registered Device ID: {employee.device_id}")

		if not employee.device_id:
			# First login - register device ID and timestamp
			from frappe.utils import now_datetime
			print(f"First login - Registering device ID: {device_id}")
			frappe.db.set_value("Employee", employee.name, {
				"device_id": device_id,
				"device_registered_on": now_datetime()
			})
			frappe.db.commit()
		else:
			# Subsequent login - verify device ID
			if employee.device_id != device_id:
				print(f"Device ID mismatch! Registered: {employee.device_id}, Current: {device_id}")
				return {
					"success": False,
					"message": _("Access denied. This account is registered to a different device")
				}
			print("Device ID verified successfully")

		# Step 6: Login the user
		frappe.local.login_manager.login_as(usr)

		# Generate API credentials for the user
		api_key, api_secret = generate_api_credentials(usr)

		print(f"API credentials generated - Key: {api_key}")

		# Step 7: Return success with all data including device_id
		return {
			"success": True,
			"message": _("Login successful"),
			"data": {
				"employee_id": employee.name,
				"employee_name": employee.employee_name,
				"user": usr,
				"api_key": api_key,
				"api_secret": api_secret,
				"device_id": device_id
			}
		}

	except Exception as e:
		frappe.log_error(frappe.get_traceback(), _("Mobile App Login Error"))
		print(f"Login error: {str(e)}")
		return {
			"success": False,
			"message": _("An error occurred during login. Please try again")
		}


def generate_api_credentials(user):
	"""
	Generate or retrieve API key and secret for the user

	Args:
		user: Username/Email

	Returns:
		tuple: (api_key, api_secret)
	"""
	user_doc = frappe.get_doc("User", user)
	api_key = user_doc.api_key
	api_secret = frappe.generate_hash(length=15)

	if not api_key:
		api_key = frappe.generate_hash(length=15)
		user_doc.api_key = api_key

	user_doc.api_secret = api_secret
	user_doc.save(ignore_permissions=True)

	return api_key, user_doc.get_password("api_secret")


@frappe.whitelist()
def reset_device_id(employee_id):
	"""
	Reset device ID for an employee (Admin only)

	Args:
		employee_id: Employee ID

	Returns:
		dict: Success or error message
	"""
	try:
		if not frappe.has_permission("Employee", "write"):
			return {
				"success": False,
				"message": _("Insufficient permissions")
			}

		frappe.db.set_value("Employee", employee_id, {
			"device_id": None,
			"device_registered_on": None
		})
		frappe.db.commit()

		return {
			"success": True,
			"message": _("Device ID has been reset successfully. Employee can now login from a new device.")
		}

	except Exception as e:
		frappe.log_error(frappe.get_traceback(), _("Reset Device ID Error"))
		return {
			"success": False,
			"message": _("An error occurred. Please try again")
		}


@frappe.whitelist()
def change_app_password(old_app_password, new_app_password):
	"""
	Allow employee to change their app password

	Args:
		old_app_password: Current app password
		new_app_password: New app password

	Returns:
		dict: Success or error message
	"""
	try:
		user = frappe.session.user

		# Get employee record (without password field)
		employee = frappe.db.get_value(
			"Employee",
			{"user_id": user},
			["name"],
			as_dict=True
		)

		if not employee:
			return {
				"success": False,
				"message": _("No employee record found")
			}

		# Get employee document to access password
		employee_doc = frappe.get_doc("Employee", employee.name)

		# Verify current password using get_password method
		stored_password = employee_doc.get_password("app_password")

		if not stored_password or stored_password != old_app_password:
			return {
				"success": False,
				"message": _("Current app password is incorrect")
			}

		# Set new password and save
		employee_doc.app_password = new_app_password
		employee_doc.save(ignore_permissions=True)
		frappe.db.commit()

		return {
			"success": True,
			"message": _("App password changed successfully")
		}

	except Exception as e:
		frappe.log_error(frappe.get_traceback(), _("Change App Password Error"))
		return {
			"success": False,
			"message": _("An error occurred. Please try again")
		}
