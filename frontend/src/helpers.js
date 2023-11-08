const setCookie = (name, val, milliseconds) => {
  try {
    document.cookie(name, val, { maxAge: milliseconds });
  } catch (error) {
    console.error("Error when setting cookie '" + name + "':", error);
  }
};

const findCookie = (name) => {
  const val = document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="));
  if (val) {
    return val.split("=")[1];
  }
  return "";
};

export { setCookie, findCookie };
