// Stable controller path for base-URL persistence. This redirects only itself.
const controller = new URL("./", location.href);
controller.search = "?view=companion&panel=1";
location.replace(controller.href);
