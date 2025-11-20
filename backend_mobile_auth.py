import frappe
from frappe import _


@frappe.whitelist(allow_guest=True)
def mobile_app_login(usr, app_password, device_id):
	# print(usr)
	# print(app_password)
	# print(device_id)
	# print("*********************")
	"""
	Authenticate user for mobile app with username/app_id and app password

	Args:
		usr: Username/Email OR App ID (backend will auto-detect)
		app_password: App password set in Employee record
		device_id: Unique device identifier from mobile app

	Returns:
		dict: Authentication result with user details or error message
	"""
	try:
		# Sanitize input - remove leading/trailing whitespace
		usr = usr.strip() if usr else ""

		if not usr:
			return {
				"success": False,
				"message": _("Username or App ID is required")
			}

		# print(f"Mobile login attempt with identifier: {usr}")

		# Step 1: Intelligent detection - check if usr is an app_id or username/email
		# First, try to find user_id by app_id in Employee table
		user_id_from_app_id = frappe.db.get_value(
			"Employee",
			{"app_id": usr},
			"user_id"
		)

		actual_user = None
		login_method = None

		if user_id_from_app_id:
			# It's an app_id, convert to user_id
			# print(f"Detected app_id '{usr}', mapped to user: {user_id_from_app_id}")
			actual_user = user_id_from_app_id
			login_method = "app_id"
		else:
			# Not an app_id, check if it's a valid username or email
			# Check if usr exists in User table (could be username or email)
			if frappe.db.exists("User", usr):
				# Direct username match
				actual_user = usr
				login_method = "username"
			else:
				# Try to find by email
				user_by_email = frappe.db.get_value("User", {"email": usr}, "name")
				if user_by_email:
					actual_user = user_by_email
					login_method = "email"

			if actual_user:
				# print(f"Treating as {login_method}: {actual_user}")
				pass
			else:
				# print(f"No user found for identifier: {usr}")
				pass

		# Step 2: Validate that we found a user
		if not actual_user:
			return {
				"success": False,
				"message": _("Invalid username, email, or app ID")
			}

		# Use actual_user for all subsequent operations
		usr = actual_user

		# Step 3: Get employee record linked to this user
		# Note: Don't fetch password field with get_value - it won't work for Password field type
		employee = frappe.db.get_value(
			"Employee",
			{"user_id": usr},
			["name", "employee_name", "allow_ess", "device_id", "device_registered_on", "app_id"],
			as_dict=True
		)

		if not employee:
			return {
				"success": False,
				"message": _("No employee record found for this user")
			}

		# print(f"Employee found: {employee.name}")

		# Step 4: Check if ESS is allowed
		if not employee.allow_ess:
			return {
				"success": False,
				"message": _("Employee Self Service is not enabled for this account")
			}

		# Step 5: Verify app password
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

		# Step 6: Handle device ID binding
		# print(f"Client Device ID: {device_id}")
		# print(f"Registered Device ID: {employee.device_id}")

		if not employee.device_id:
			# First login - register device ID and timestamp
			from frappe.utils import now_datetime
			# print(f"First login - Registering device ID: {device_id}")
			frappe.db.set_value("Employee", employee.name, {
				"device_id": device_id,
				"device_registered_on": now_datetime()
			})
			frappe.db.commit()
		else:
			# Subsequent login - verify device ID
			if employee.device_id != device_id:
				# print(f"Device ID mismatch! Registered: {employee.device_id}, Current: {device_id}")
				return {
					"success": False,
					"message": _("Access denied. This account is registered to a different device")
				}
			# print("Device ID verified successfully")

		# Step 7: Login the user
		frappe.local.login_manager.login_as(usr)

		# Generate API credentials for the user
		api_key, api_secret = generate_api_credentials(usr)

		# print(f"API credentials generated - Key: {api_key}")

		# Step 8: Return success with all data including device_id and app_id
		return {
			"success": True,
			"message": _("Login successful"),
			"data": {
				"employee_id": employee.name,
				"employee_name": employee.employee_name,
				"user": usr,
				"api_key": api_key,
				"api_secret": api_secret,
				"device_id": device_id,
				"app_id": employee.app_id
			}
		}

	except Exception as e:
		frappe.log_error(frappe.get_traceback(), _("Mobile App Login Error"))
		# print(f"Login error: {str(e)}")
		return {
			"success": False,
			"message": _("An error occurred during login. Please try again")
		}


def generate_api_credentials(user):
	# print("generate_api_credentials")
	"""
	Generate or retrieve API key and secret for the user

	Args:
		user: Username/Email

	Returns:
		tuple: (api_key, api_secret)
	"""
	user_doc = frappe.get_doc("User", user)
	api_key = user_doc.api_key
	# print(api_key)
	api_secret = frappe.generate_hash(length=15)
	# print(api_secret)

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