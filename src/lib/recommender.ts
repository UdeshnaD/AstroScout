import type { SpotPlan } from "@/types/spot";

export const factorNames = [
  "Clear skies",
  "Darkness",
  "Easy travel",
  "Low moonlight",
] as const;
export type Features = [number, number, number, number];
export type Feedback = { id: string; features: Features; liked: boolean };
export type Priorities = Features;
export const defaultPriorities: Priorities = [40, 25, 25, 10];
export const observingProfiles: Record<string, Priorities> = {
  Balanced: defaultPriorities,
  "Deep sky": [35, 35, 10, 20],
  "Quick trip": [30, 10, 55, 5],
  "Moon & planets": [60, 5, 35, 0],
};

export function featuresFor(plan: SpotPlan, hour = 0): Features {
  const weather = plan.weather.hourly[hour] ?? plan.weather;
  return [
    ((100 - weather.cloudCover) * 0.65 +
      (100 - weather.precipitationChance) * 0.2 +
      Math.min(100, weather.visibilityKm * 4) * 0.15) /
      100,
    (9 - plan.bortleRating) / 8,
    Math.max(0, 1 - plan.travelTimeMinutes / 180),
    1 - plan.astronomy.moonIllumination / 100,
  ].map((x) => Math.max(0, Math.min(1, x))) as Features;
}

export function contributions(
  features: Features,
  priorities: Priorities,
): Features {
  const total = priorities.reduce((a, b) => a + b, 0);
  const weights = total > 0 ? priorities : defaultPriorities;
  return features.map(
    (value, i) => ((value * weights[i]) / (total || 100)) * 100,
  ) as Features;
}

const sigmoid = (x: number) =>
  1 / (1 + Math.exp(-Math.max(-30, Math.min(30, x))));

// Regularized logistic regression, retrained deterministically from local feedback.
// Centered inputs let coefficients describe a preference for each feature.
export function trainPreferenceModel(feedback: Feedback[]) {
  const weights = [0, 0, 0, 0];
  let bias = 0;
  if (!feedback.length) return { weights, bias };
  for (let epoch = 0; epoch < 160; epoch++) {
    const gradient = [0, 0, 0, 0];
    let biasGradient = 0;
    for (const sample of feedback) {
      const x = sample.features.map((v) => v * 2 - 1);
      const prediction = sigmoid(
        bias + x.reduce((sum, v, i) => sum + v * weights[i], 0),
      );
      const error = prediction - Number(sample.liked);
      x.forEach((v, i) => {
        gradient[i] += error * v;
      });
      biasGradient += error;
    }
    weights.forEach((weight, i) => {
      weights[i] -= 0.15 * (gradient[i] / feedback.length + 0.08 * weight);
    });
    bias -= (0.15 * biasGradient) / feedback.length;
  }
  return { weights, bias };
}

export function preferenceScore(
  features: Features,
  model: ReturnType<typeof trainPreferenceModel>,
) {
  return (
    sigmoid(
      model.bias +
        features.reduce((sum, v, i) => sum + (v * 2 - 1) * model.weights[i], 0),
    ) * 100
  );
}

export function rankPlans(
  plans: SpotPlan[],
  priorities: Priorities,
  feedback: Feedback[],
  learn: boolean,
  hour = 0,
) {
  const model = trainPreferenceModel(feedback);
  // Bound learned influence until there are multiple independent labelled examples.
  const learnedShare = learn ? Math.min(0.3, feedback.length * 0.05) : 0;
  return plans
    .map((plan) => {
      const features = featuresFor(plan, hour);
      const parts = contributions(features, priorities);
      const baseScore = parts.reduce((a, b) => a + b, 0);
      const learnedScore = preferenceScore(features, model);
      const score = Math.round(
        baseScore * (1 - learnedShare) + learnedScore * learnedShare,
      );
      return {
        ...plan,
        score,
        baseScore,
        learnedScore,
        learnedShare,
        features,
        contributions: parts,
        condition:
          score >= 75
            ? ("good" as const)
            : score >= 50
              ? ("mixed" as const)
              : ("poor" as const),
      };
    })
    .sort(
      (a, b) => b.score - a.score || a.travelTimeMinutes - b.travelTimeMinutes,
    )
    .map((plan, index) => ({ ...plan, rank: index + 1 }));
}

export type RankedPlan = ReturnType<typeof rankPlans>[number];
