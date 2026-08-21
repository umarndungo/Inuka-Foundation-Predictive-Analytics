# Inuka Foundation Predictive Analytics
## Exploratory Data Analysis & Target Audit

**Dataset:** `synthetic_beneficiaries.json`

**Records:** 500

**Features:** 11

**Target:** `dropped_out`

**Synthetic dropout rate:** 23.00%

> **Important:** All findings in this report are based on synthetic data.
> They must not be presented as actual Inuka Foundation dropout statistics.

---

# 1. Dataset Quality Audit

Total records: **500**

Total missing values: **0**

Full duplicate records: **0**

Duplicate beneficiary IDs: **0**

## Columns

- `beneficiary_id` — str, 500 unique values, 0 missing values\n- `timestamp` — str, 494 unique values, 0 missing values\n- `region` — str, 5 unique values, 0 missing values\n- `pillar` — str, 4 unique values, 0 missing values\n- `attendance_rate` — float64, 478 unique values, 0 missing values\n- `grade_average` — float64, 472 unique values, 0 missing values\n- `socioeconomic_index` — float64, 276 unique values, 0 missing values\n- `historical_dropouts_in_family` — int64, 4 unique values, 0 missing values\n- `assignment_completion` — float64, 485 unique values, 0 missing values\n- `travel_distance_km` — float64, 456 unique values, 0 missing values\n- `dropped_out` — int64, 2 unique values, 0 missing values\n
---

# 2. Four Inuka Pillars

The dataset contains the four intended programme dimensions:

- **Scholarship:** 120 beneficiaries\n- **Plus:** 117 beneficiaries\n- **Vocational:** 129 beneficiaries\n- **Tech:** 134 beneficiaries\n

The pillar dimension must remain visible throughout
the predictive analytics workflow rather than being treated
as an afterthought.

---

# 3. Target Audit

The supervised learning target is:

`dropped_out`

This target represents a historical synthetic outcome.

The target should NOT be generated using predictor thresholds
during model training.

The purpose is for the model to learn relationships between
predictor variables and the historical outcome.

- Did not drop out: 385 (77.00%)\n- Dropped out: 115 (23.00%)\n

---

# 4. Pillar-Level Outcome Analysis

| pillar      |   beneficiaries |   dropout_count |   dropout_rate |   avg_attendance |   avg_grade |   avg_assignment_completion |   avg_travel_distance |
|:------------|----------------:|----------------:|---------------:|-----------------:|------------:|----------------------------:|----------------------:|
| Plus        |             117 |              25 |          21.37 |            0.692 |      69.485 |                       0.664 |                14.55  |
| Scholarship |             120 |              22 |          18.33 |            0.697 |      67.302 |                       0.665 |                14.215 |
| Tech        |             134 |              29 |          21.64 |            0.701 |      69.826 |                       0.665 |                13.818 |
| Vocational  |             129 |              39 |          30.23 |            0.666 |      69.674 |                       0.658 |                14.454 |

---

# 5. Regional Analysis

| region   |   beneficiaries |   dropout_count |   dropout_rate |   avg_attendance |   avg_grade |   avg_socioeconomic_index |   avg_assignment_completion |   avg_travel_distance |
|:---------|----------------:|----------------:|---------------:|-----------------:|------------:|--------------------------:|----------------------------:|----------------------:|
| Eldoret  |             105 |              20 |          19.05 |            0.712 |      69.767 |                     2.796 |                       0.691 |                13.794 |
| Kisumu   |              92 |              42 |          45.65 |            0.583 |      63.399 |                     2.294 |                       0.558 |                18.365 |
| Mombasa  |             114 |              22 |          19.3  |            0.681 |      70.906 |                     2.764 |                       0.692 |                12.329 |
| Nairobi  |              97 |              15 |          15.46 |            0.726 |      69.616 |                     3.057 |                       0.693 |                13.513 |
| Nakuru   |              92 |              16 |          17.39 |            0.738 |      71.264 |                     2.752 |                       0.669 |                13.804 |

---

# 6. Predictor Analysis

The main candidate predictors are:

- Attendance rate
- Grade average
- Socioeconomic index
- Historical dropouts in family
- Assignment completion
- Travel distance

These variables should be evaluated for association with
the historical outcome before model development.

---

# 7. Historical Family Dropout vs Actual Dropout

|   historical_dropouts_in_family |   beneficiaries |   dropout_count |   dropout_rate |
|--------------------------------:|----------------:|----------------:|---------------:|
|                               0 |             237 |              43 |          18.14 |
|                               1 |             124 |              23 |          18.55 |
|                               2 |              90 |              24 |          26.67 |
|                               3 |              49 |              25 |          51.02 |

### Interpretation rule

A higher dropout rate among beneficiaries with more historical
family dropouts would indicate an **association in the synthetic
dataset**.

It does NOT establish that family dropout history causes dropout.

This distinction is important for responsible predictive analytics.

---

# 8. Attendance vs Dropout

| attendance_band   |   beneficiaries |   dropout_count |   dropout_rate |
|:------------------|----------------:|----------------:|---------------:|
| <=50%             |              76 |              30 |          39.47 |
| 51-60%            |              99 |              28 |          28.28 |
| 61-70%            |              87 |              23 |          26.44 |
| 71-80%            |              88 |              14 |          15.91 |
| 81-90%            |              87 |              12 |          13.79 |
| >90%              |              63 |               8 |          12.7  |

Attendance is particularly important because it is an operationally
actionable signal.

If declining attendance is associated with higher historical dropout
rates, attendance could become an early-warning feature for proactive
intervention.

---

# 9. Correlation Matrix

|                               |   attendance_rate |   grade_average |   socioeconomic_index |   historical_dropouts_in_family |   assignment_completion |   travel_distance_km |   dropped_out |
|:------------------------------|------------------:|----------------:|----------------------:|--------------------------------:|------------------------:|---------------------:|--------------:|
| attendance_rate               |         1         |       0.115486  |             0.0342962 |                      -0.204783  |               0.0867535 |           -0.0453849 |     -0.243516 |
| grade_average                 |         0.115486  |       1         |             0.0218037 |                      -0.0346593 |               0.0209798 |            0.0114289 |     -0.106698 |
| socioeconomic_index           |         0.0342962 |       0.0218037 |             1         |                      -0.105189  |               0.029137  |           -0.0248899 |     -0.143091 |
| historical_dropouts_in_family |        -0.204783  |      -0.0346593 |            -0.105189  |                       1         |              -0.0472553 |            0.158235  |      0.197329 |
| assignment_completion         |         0.0867535 |       0.0209798 |             0.029137  |                      -0.0472553 |               1         |           -0.0788817 |     -0.183496 |
| travel_distance_km            |        -0.0453849 |       0.0114289 |            -0.0248899 |                       0.158235  |              -0.0788817 |            1         |      0.194593 |
| dropped_out                   |        -0.243516  |      -0.106698  |            -0.143091  |                       0.197329  |              -0.183496  |            0.194593  |      1        |

Correlation should be treated as an exploratory diagnostic rather
than proof of causation.

---

# 10. Data Science Decision

The next stage is model development.

Before training the final model we should confirm:

1. `dropped_out` is sufficiently represented in both classes.
2. Predictors contain meaningful variation.
3. No target leakage exists.
4. Categorical features are encoded using training data only.
5. Train/test splitting occurs before fitting preprocessing.
6. Model performance is evaluated using appropriate metrics.
7. Performance is assessed beyond accuracy, especially because
   false negatives may be operationally costly.
8. The four Inuka pillars remain visible in model evaluation.

---

# 11. Important Limitation

This dataset is synthetic.

Therefore:

- dropout rates are not real Inuka statistics;
- regional differences are synthetic;
- pillar differences are synthetic;
- family-history relationships are synthetic;
- model performance on this dataset does not establish
  real-world predictive performance.

The model should ultimately be validated against real historical
Inuka outcomes when appropriately governed data becomes available.

---

# Output Files

The EDA process produces:

- `dataset_audit.csv`
- `target_distribution.csv`
- `pillar_analysis.csv`
- `regional_analysis.csv`
- `numeric_summary.csv`
- `correlation_matrix.csv`
- `target_feature_comparison.csv`
- `family_history_vs_dropout.csv`
- `attendance_vs_dropout.csv`

and visualisations under:

`data/eda_output/plots/`

