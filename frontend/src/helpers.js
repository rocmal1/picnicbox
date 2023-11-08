const setCookie = (name, val, maxSeconds) => {
  try {
    document.cookie = name + "=" + val + ";maxAge:" + maxSeconds;
  } catch (error) {
    console.error("Error when setting cookie '" + name + "':", error);
  }
};

const getCookie = (name) => {
  const val = document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="));
  if (val) {
    return val.split("=")[1];
  }
  return "";
};

export { setCookie, getCookie };
