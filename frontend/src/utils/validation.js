
// Helix8 Frontend Form Validator
export const validators = {
  required: (value, label) => {
    if (!value || value.toString().trim() === "") return `${label} is required`;
    return null;
  },
  email: (value) => {
    if (!value) return null;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(value)) return "Valid email address required";
    return null;
  },
  phone: (value) => {
    if (!value) return null;
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length < 10) return "Valid phone number required (10 digits)";
    return null;
  },
  minLength: (value, min, label) => {
    if (!value) return null;
    if (value.length < min) return `${label} must be at least ${min} characters`;
    return null;
  },
  maxLength: (value, max, label) => {
    if (!value) return null;
    if (value.length > max) return `${label} must be less than ${max} characters`;
    return null;
  },
  password: (value) => {
    if (!value) return "Password is required";
    if (value.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(value)) return "Password must contain at least one uppercase letter";
    if (!/[0-9]/.test(value)) return "Password must contain at least one number";
    return null;
  },
  positiveNumber: (value, label) => {
    if (!value && value !== 0) return null;
    if (isNaN(value) || parseFloat(value) < 0) return `${label} must be a positive number`;
    return null;
  },
};

export const validateForm = (form, rules) => {
  const errors = {};
  for (const field of Object.keys(rules)) {
    const fieldRules = rules[field];
    for (const rule of fieldRules) {
      const error = rule(form[field]);
      if (error) { errors[field] = error; break; }
    }
  }
  return errors;
};

export const hasErrors = (errors) => Object.keys(errors).length > 0;

export const FieldError = ({ error }) => {
  if (!error) return null;
  return (
    <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", fontWeight: "500" }}>
      ⚠ {error}
    </div>
  );
};

export const inputStyle = (hasError) => ({
  width: "100%",
  padding: "10px 12px",
  backgroundColor: "#04081a",
  border: `1px solid ${hasError ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
  borderRadius: "8px",
  color: "white",
  fontSize: "14px",
  boxSizing: "border-box",
});

export default validateForm;
