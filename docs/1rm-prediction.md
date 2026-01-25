# 1RM Prediction Formulas with Confidence Intervals

These formulas estimate 1RM from submaximal reps to failure. All weights are in kilograms (kg).

## Deadlift
Methodology: Epley formula with systematic bias correction.

Point estimate:
- 1RM = 1.04 * W * (1 + R/30)

Standard error of estimate (SEE):
- SEE(R) = 3.5 + 1.5 * (R - 3)  for 3 < R <= 8
- SEE(R) = 11.0                 for R > 8

95% confidence interval:
- CI95 = [1RM - 1.96 * SEE, 1RM + 1.96 * SEE]

References:
- LeSuer, D.A., McCormick, J.H., Mayhew, J.L., Wasserstein, R.L., & Arnold, M.D. (1997). The accuracy of prediction equations for estimating 1-RM performance in the bench press, squat, and deadlift. Journal of Strength and Conditioning Research, 11(4), 211-213.
  - Finding: All formulas underestimate deadlift 1RM; r = 0.95-0.97.
  - Justification for 1.04 correction factor.
- Reynolds, J.M., Gordon, T.J., & Robergs, R.A. (2006). Prediction of one repetition maximum strength from multiple repetition maximum testing and anthropometry. Journal of Strength and Conditioning Research, 20(3), 584-592.
  - SEE progression: 2.98 kg (5RM) -> 5.38 kg (10RM) -> 7.36 kg (20RM).

## Squat
Methodology: Lombardi formula.

Point estimate:
- 1RM = W * R^0.10

Standard error of estimate (SEE):
- SEE(R) = 3.0 + 1.5 * (R - 3)  for 3 < R <= 8
- SEE(R) = 9.0                 for R > 8

95% confidence interval:
- CI95 = [1RM - 1.96 * SEE, 1RM + 1.96 * SEE]

References:
- Ribeiro, A.S., et al. (2024). Accuracy of 1RM Prediction Equations Before and After Resistance Training in Three Different Lifts. International Journal of Strength and Conditioning, 4(1).
  - Lombardi for squat: bias = 0.4 kg, 95% CI: -10.2 to 11.0 kg.
  - Best performing formula for trained males.
- LeSuer, D.A., et al. (1997). See deadlift references.
  - Lombardi r = 0.98 for squat, SEE approx 5-6 kg at 5-10 reps.

## Bench Press
Methodology: Lombardi formula.

Point estimate:
- 1RM = W * R^0.10

Standard error of estimate (SEE):
- SEE(R) = 2.0 + 0.7 * (R - 3)  for 3 < R <= 10
- SEE(R) = 7.5                 for R > 10

95% confidence interval:
- CI95 = [1RM - 1.96 * SEE, 1RM + 1.96 * SEE]

References:
- Ribeiro, A.S., et al. (2024). See squat references.
  - Lombardi for bench press: bias = 0.1 kg, 95% CI: -3.6 to 3.8 kg.
  - Highest accuracy among all formulas tested.
- Reynolds, J.M., et al. (2006). See deadlift references.
  - Chest press SEE: 2.98 kg (5RM), 5.38 kg (10RM).
- Mayhew, J.L., et al. (1995). Muscular endurance repetitions to predict bench press strength in men of different training levels. Journal of Sports Medicine and Physical Fitness, 35(2), 108-113.
  - Mayhew formula: r = 0.96, SEE approx 4.5 kg.

## Overhead Press
Methodology: Epley formula with estimated bias correction.

Point estimate:
- 1RM = 1.04 * W * (1 + R/30)

Standard error of estimate (SEE):
- SEE(R) = 2.5 + 0.5 * (R - 3)  for 3 < R <= 10
- SEE(R) = 6.5                 for R > 10

95% confidence interval:
- CI95 = [1RM - 1.96 * SEE, 1RM + 1.96 * SEE]

References:
- Garcia-Ramos, A., Haff, G.G., Padial, P., & Feriche, B. (2018). Prediction of the maximum number of repetitions and repetitions in reserve from barbell velocity. International Journal of Sports Physiology and Performance, 13(3), 353-359.
  - Load-velocity relationship for overhead press: SEE approx 4.1%.
  - Supports estimated SEE range.
- Wood, T.M., Maddalozzo, G.F., & Harter, R.A. (2002). Accuracy of seven equations for predicting 1-RM performance of apparently healthy, sedentary older adults. Measurement in Physical Education and Exercise Science, 6(2), 61-72.
  - Shoulder press showed systematic underestimation across all formulas.
  - Justifies correction factor.
- LeSuer, D.A., et al. (1997). See deadlift references.
  - Epley formula r = 0.97 across upper body exercises.

## Rows
Methodology: Lombardi formula with overestimation correction.

Point estimate:
- 1RM = 0.93 * W * R^0.10

Alternative (Mayhew formula):
- 1RM = 0.93 * (100 * W) / (52.2 + 41.9 * e^(-0.055 * R))

Standard error of estimate (SEE):
- SEE(R) = 2.5 + 1.0 * (R - 3)  for 3 < R <= 10
- SEE(R) = 7.0                 for R > 10

95% confidence interval:
- CI95 = [1RM - 1.96 * SEE, 1RM + 1.96 * SEE]

References:
- Aidar, F.J., et al. (2009). Predicting one repetition maximum equations accuracy in paralympic rowers with motor disabilities. Journal of Strength and Conditioning Research, 23(3), 1045-1050.
  - Lying T-bar row: no statistical differences between predicted and actual 1RM (p = 0.84).
  - Direct validation for rowing movement.
- Fernandes, J.F.T., et al. (2021). Prediction of one repetition maximum using reference minimum velocity threshold values in young and middle-aged resistance-trained males. Behavioral Sciences, 11(5), 71.
  - Bent-over row showed 8.6-19.9% absolute error with overestimation bias.
  - Justifies 0.93 correction factor (7% reduction).
- Garcia-Ramos, A., et al. (2019). Reliability and validity of different methods of estimating the one-repetition maximum during the free-weight prone bench pull exercise. Journal of Sports Sciences, 37(19), 2205-2212.
  - Lombardi overestimated 3.43%, CV 3.44%.

## Pull-Ups
Methodology: Epley formula applied to system load.

Point estimate:
- 1RM_total = (BW + AW) * (1 + R/30)
- 1RM_added = 1RM_total - BW

Alternative (Halet regression for lat-pull prediction):
- 1RM_latpull = 0.61 * (R * BW) + 14.6

Standard error of estimate (SEE):
- SEE(R) = 2.0 + 1.0 * (R - 3)  for 3 < R <= 10
- SEE(R) = 6.0                 for R > 10

95% confidence interval:
- CI95 = [1RM_total - 1.96 * SEE, 1RM_total + 1.96 * SEE]

Notes:
- Epley can be applied to total load (bodyweight + added weight) for pull-up 1RM estimates.

References:
- Halet, K.A., Mayhew, J.L., Murphy, C., & Fanthorpe, J. (2009). Relationship of 1 repetition maximum lat-pull to pull-up and lat-pull repetitions in elite collegiate women swimmers. Journal of Strength and Conditioning Research, 23(5), 1496-1502.
  - Pull-ups x bodyweight predictor: r = 0.86, SEE = 4.4 kg.
  - With %fat added: r = 0.90, SEE = 3.9 kg.
- Johnson, D., Lynch, J., Nash, K., et al. (2009). Relationship of lat-pull repetitions and pull-ups to maximal lat-pull and pull-up strength in men and women. Journal of Strength and Conditioning Research, 23(3), 1022-1028.
  - Trained males: pull-up 1RM = 1.16 * bodyweight.
  - Correlation r = 0.78 (p < 0.01).
- LeSuer, D.A., et al. (1997). See deadlift references.
  - Epley applicable to total load calculations.
