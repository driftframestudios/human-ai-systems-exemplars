# SECOM: rate and event volume

This reference compares observed in-house line-test results across the four calendar months represented in the released SECOM labels. The production entities belong to a semiconductor manufacturing process. July and October have partial observation coverage.

## Source and attribution

McCann, M. & Johnston, A. (2008). *SECOM* [Dataset]. UCI Machine Learning Repository. <https://doi.org/10.24432/C54305>.

The [UCI dataset page](https://archive.ics.uci.edu/dataset/179/secom) provides the data under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). `secom-labels.data` preserves the downloaded [label file](https://archive.ics.uci.edu/ml/machine-learning-databases/secom/secom_labels.data) byte for byte. Dataset credit and its license travel with the figure and page. The repository license continues to govern the surrounding implementation.

Source SHA-256: `126884cf453705c9e61a903fe906f0665a3b45ce3639e621edc5c93c89627e03`.

## Derivation

- Each source line contains a label and quoted civil timestamp. `-1` means pass; `1` means fail.
- All 1,567 records contribute to exactly one calendar-month group; 104 have the failure label.
- Month membership comes from the source timestamp. The source leaves timezone unspecified.
- Each rate is `100 * failed / tested`. JSON retains the numeric calculation; SVG and HTML show one decimal. Counts remain integers.
- First and last observed days describe coverage. The July 19-31 and October 1-17 groups are partial months.
- The feature matrix stays with its upstream owner. This example uses labels and timestamps to compare released records.

Generate the SVG, exact-value JSON and Atlas section together from the repository root:

```sh
node tools/build-atlas-reference.mjs --write
node tools/build-atlas-reference.mjs --check
node --test tests/visualization-fidelity-atlas/atlas-reference.test.mjs
```

The source digest binds the derivation to these released records. A different dataset or revised source receives its own reviewed identity. A later panel may use another dataset when its units, population, time basis and source remain explicit.

## Reading boundary

July has the highest observed failure rate; August has the most failed tests. Those statements describe the released record set. Effort, severity, causal explanations, intervention priority and inference about broader production each require fitting additional evidence. No sampling model is assumed in this descriptive comparison.

The figure's visible context and descriptive SVG groups refer to the same subject. A person supplies any receiving task; the receiving interface determines which artifact representation is available.
