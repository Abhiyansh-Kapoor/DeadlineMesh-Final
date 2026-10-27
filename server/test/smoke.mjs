import assert from "node:assert/strict";

const base = process.env.TEST_URL || "http://localhost:5001";
const stamp = Date.now();

async function request(method, path, body, token) {
  const response = await fetch(base + "/api" + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

const signup = await request("POST", "/auth/signup", {
  name: "Smoke Test", email: "smoke-" + stamp + "@example.test", password: "SmokeTest2026!",
});
assert.equal(signup.status, 201);
const token = signup.data.token;
const other = await request("POST", "/auth/signup", {
  name: "Second User", email: "other-" + stamp + "@example.test", password: "SmokeTest2026!",
});
assert.equal(other.status, 201);
assert.equal((await request("GET", "/projects")).status, 401);
assert.equal((await request("POST", "/projects", {}, token)).status, 400);

const created = await request("POST", "/projects", {
  name: "Integration check", description: "Disposable test project", deadline: "2026-11-15",
}, token);
assert.equal(created.status, 201);
const projectId = created.data.project.id;
assert.equal(created.data.project.deadline, "2026-11-15");
assert.equal((await request("GET", "/tasks/project/" + projectId, undefined, other.data.token)).status, 404);

async function addTask(name, duration, dependencies = [], status = "Pending") {
  const response = await request("POST", "/tasks/project/" + projectId, {
    name, description: "", duration, start_date: "2026-10-28",
    status, priority: "Medium", dependencies,
  }, token);
  assert.equal(response.status, 201);
  return response.data.task;
}

const research = await addTask("Research", 2, [], "Completed");
const build = await addTask("Build", 3, [research.id], "In Progress");
const test = await addTask("Test", 1, [build.id]);
const list = await request("GET", "/tasks/project/" + projectId, undefined, token);
assert.equal(list.status, 200);
assert.equal(list.data.tasks.length, 3);
assert.equal(list.data.tasks.find((task) => task.id === test.id).is_blocked, true);
assert.equal(list.data.tasks.find((task) => task.id === research.id).start_date, "2026-10-28");

const cycle = await request("PATCH", "/tasks/" + research.id, { dependencies: [test.id] }, token);
assert.equal(cycle.status, 400);
assert.match(cycle.data.message, /cycle/i);
const afterCycle = await request("GET", "/tasks/project/" + projectId, undefined, token);
assert.deepEqual(afterCycle.data.tasks.find((task) => task.id === research.id).dependencies, []);

const critical = await request("GET", "/projects/" + projectId + "/critical-path", undefined, token);
assert.equal(critical.status, 200);
assert.equal(critical.data.analysis.project_duration, 6);
assert.equal(critical.data.analysis.critical_path.length, 3);

const simulated = await request("POST", "/projects/" + projectId + "/what-if/delay", {
  task_id: build.id, added_duration: 2,
}, token);
assert.equal(simulated.status, 200);
assert.equal(simulated.data.simulation.project_delay, 2);
const afterSimulation = await request("GET", "/tasks/project/" + projectId, undefined, token);
assert.equal(afterSimulation.data.tasks.find((task) => task.id === build.id).duration, 3);

assert.equal((await request("PATCH", "/tasks/" + build.id, { status: "Completed" }, token)).status, 200);
const unblocked = await request("GET", "/tasks/project/" + projectId, undefined, token);
assert.equal(unblocked.data.tasks.find((task) => task.id === test.id).is_blocked, false);
assert.equal((await request("DELETE", "/projects/" + projectId, undefined, token)).status, 200);
assert.equal((await request("GET", "/tasks/project/" + projectId, undefined, token)).status, 404);

const page = await fetch(base + "/dashboard");
assert.equal(page.status, 200);
assert.match(await page.text(), /DeadlineMesh/);
console.log("Integration smoke test passed: auth, CRUD, dependencies, blocked work, CPM, simulation, dates and production page.");
