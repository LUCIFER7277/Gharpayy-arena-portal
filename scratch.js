const u = { blocker: null };
try {
  ((u.blocker || "").trim() ? 1 : 0);
  console.log("SUCCESS");
} catch (e) {
  console.error("ERROR 1", e.message);
}

const v = { blocker: [null] };
try {
  ((v.blocker || "").trim() ? 1 : 0);
} catch (e) {
  console.error("ERROR 2", e.message);
}
