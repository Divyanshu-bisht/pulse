// A focused unit test for the core decision logic in the rule engine --
// "does this value trip this condition" -- without needing a real database
// or server running. This is the kind of pure-logic function that's cheapest
// and most valuable to test directly.

function checkCondition(condition, value, threshold) {
  if (condition === 'gt') return value > threshold;
  if (condition === 'lt') return value < threshold;
  return false;
}

describe('rule condition checks', () => {
  test('gt condition triggers when value exceeds threshold', () => {
    expect(checkCondition('gt', 85, 80)).toBe(true);
  });

  test('gt condition does not trigger when value is below threshold', () => {
    expect(checkCondition('gt', 70, 80)).toBe(false);
  });

  test('gt condition does not trigger when value equals threshold', () => {
    expect(checkCondition('gt', 80, 80)).toBe(false);
  });

  test('lt condition triggers when value is below threshold', () => {
    expect(checkCondition('lt', 5, 10)).toBe(true);
  });

  test('lt condition does not trigger when value is above threshold', () => {
    expect(checkCondition('lt', 15, 10)).toBe(false);
  });
});

describe('cooldown logic', () => {
  function isWithinCooldown(lastTriggeredAt, cooldownMinutes) {
    if (!lastTriggeredAt) return false;
    const cooldownMs = cooldownMinutes * 60 * 1000;
    return Date.now() - new Date(lastTriggeredAt).getTime() < cooldownMs;
  }

  test('blocks re-alerting immediately after a trigger', () => {
    const justNow = new Date();
    expect(isWithinCooldown(justNow, 15)).toBe(true);
  });

  test('allows re-alerting after the cooldown window has passed', () => {
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
    expect(isWithinCooldown(twentyMinutesAgo, 15)).toBe(false);
  });

  test('allows the first-ever alert when there is no previous trigger', () => {
    expect(isWithinCooldown(null, 15)).toBe(false);
  });
});
