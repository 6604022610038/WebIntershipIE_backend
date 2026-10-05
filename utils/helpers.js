// Shared helper functions go here.
// Example: pick only allowed fields from a request body (used across several controllers)
function pickFields(obj, fields) {
  const result = {};
  fields.forEach((key) => {
    if (obj[key] !== undefined) result[key] = obj[key];
  });
  return result;
}

module.exports = { pickFields };
