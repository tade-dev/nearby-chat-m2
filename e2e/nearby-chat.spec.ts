import { expect, test, type Page } from "@playwright/test";

async function enterName(page: Page, name: string) {
  await page.getByTestId("name-input").fill(name);
  await page.getByTestId("enter-room").click();
  await expect(page.getByTestId("messages")).toBeVisible();
}

test("host + two guests chat, then ended room cannot be rejoined", async ({
  browser,
}) => {
  const hostCtx = await browser.newContext();
  const g1Ctx = await browser.newContext();
  const g2Ctx = await browser.newContext();
  const host = await hostCtx.newPage();
  const g1 = await g1Ctx.newPage();
  const g2 = await g2Ctx.newPage();

  await host.goto("/");
  await host.getByTestId("create-room").click();
  await enterName(host, "Host Ada");
  const code = (await host.getByTestId("room-code").innerText()).trim();
  expect(code).toHaveLength(6);
  await expect(host.getByTestId("qr")).toBeVisible();
  await expect(host.getByTestId("end-room")).toBeVisible();

  await g1.goto("/");
  await g1.getByTestId("join-code-input").fill(code);
  await g1.getByTestId("join-button").click();
  await enterName(g1, "Guest Bea");

  await g2.goto(`/r/${code}`);
  await enterName(g2, "Guest Cam");

  await expect(host.getByTestId("presence-list")).toContainText("Host Ada");
  await expect(host.getByTestId("presence-list")).toContainText("Guest Bea");
  await expect(host.getByTestId("presence-list")).toContainText("Guest Cam");

  await g1.getByTestId("message-input").fill("hello from bea");
  await g1.getByTestId("send-message").click();
  await expect(host.getByTestId("messages")).toContainText("hello from bea");
  await expect(g2.getByTestId("messages")).toContainText("hello from bea");

  await host.getByTestId("message-input").fill("host here");
  await host.getByTestId("send-message").click();
  await expect(g1.getByTestId("messages")).toContainText("host here");

  await host.getByTestId("end-room").click();
  await expect(g1.getByTestId("blocked-reason")).toContainText(/ended by the host/i);
  await expect(g2.getByTestId("blocked-reason")).toContainText(/ended by the host/i);

  const late = await (await browser.newContext()).newPage();
  await late.goto(`/r/${code}`);
  await expect(late.getByTestId("blocked-reason")).toContainText(/ended by the host/i);
  await expect(late.getByTestId("name-input")).toHaveCount(0);

  await hostCtx.close();
  await g1Ctx.close();
  await g2Ctx.close();
});

test("three tabs in one browser are distinct people", async ({ page, context }) => {
  await page.goto("/");
  await page.getByTestId("create-room").click();
  await enterName(page, "Host Ada");
  const code = (await page.getByTestId("room-code").innerText()).trim();

  const g1 = await context.newPage();
  await g1.goto("/");
  await g1.getByTestId("join-code-input").fill(code);
  await g1.getByTestId("join-button").click();
  await enterName(g1, "Guest Bea");

  const g2 = await context.newPage();
  await g2.goto(`/r/${code}`);
  await enterName(g2, "Guest Cam");

  await expect(page.getByTestId("presence-list")).toContainText("Host Ada");
  await expect(page.getByTestId("presence-list")).toContainText("Guest Bea");
  await expect(page.getByTestId("presence-list")).toContainText("Guest Cam");
  await expect(page.getByTestId("end-room")).toBeVisible();
  await expect(g1.getByTestId("end-room")).toHaveCount(0);
  await expect(g2.getByTestId("end-room")).toHaveCount(0);

  await g2.getByTestId("message-input").fill("cam from another tab");
  await g2.getByTestId("send-message").click();
  await expect(page.getByTestId("messages")).toContainText("cam from another tab");
  await expect(g1.getByTestId("messages")).toContainText("cam from another tab");
});

test("expired rooms cannot be joined", async ({ page }) => {
  const mqttMod = await import("mqtt");
  const connect = (mqttMod.default?.connect || mqttMod.connect) as typeof import("mqtt").connect;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  const client = connect("wss://broker.emqx.io:8084/mqtt", {
    clientId: `ncm2-test-${Date.now()}`,
    connectTimeout: 10_000,
  });
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("mqtt connect timeout")), 12_000);
    client.on("connect", () => {
      clearTimeout(t);
      resolve();
    });
    client.on("error", reject);
  });
  const createdAt = Date.now() - 50 * 60 * 1000;
  const expired = {
    v: 1,
    code,
    createdAt,
    expiresAt: createdAt + 45 * 60 * 1000,
    status: "active",
    hostClientId: "test-host",
  };
  client.publish(`tade-nearby-chat-m2/${code}/meta`, JSON.stringify(expired), {
    qos: 1,
    retain: true,
  });
  await new Promise((r) => setTimeout(r, 500));
  client.end(true);

  await page.goto(`/r/${code}`);
  await expect(page.getByTestId("blocked-reason")).toContainText(/expired/i);
  await expect(page.getByTestId("name-input")).toHaveCount(0);
});
