# Fewer numbers in alternate readings

Both output-selection strategies are active. Input vocabulary and grammar,
editor behavior, and canonical author recovery are unchanged.

## Construction weighting

At each full-grammar production choice, an alternative that necessarily
introduces digits gets weight 1; other alternatives get weight 12. The analysis
follows required child symbols, so wrappers around numeric formats, quantities,
dates, times, and amounts can be downweighted as well as numeric leaves.

These are relative weights among the currently available productions, not a
promise that 1/13 of readings will contain numbers. The existing mixture of
reviewed sentence families and the full grammar is unchanged. Optional numeric
paths and learned literal spellings can still generate numbers.

## Magnitude weighting

For ordinary numeric slots, category weights are:

| Range | Share of category weight |
| --- | ---: |
| 0–99 | 90% |
| 100–9,999 | 9% |
| 10,000 and above | 1% total |

When larger categories are available, the final 1% is divided across them. The
value within a selected category is still chosen from its existing domain; this
does not separately favor round numbers. Dedicated time/date/money formats keep
their existing validity domains. Their appearance can be reduced through the
construction weights, without making a clock or calendar field invalid.

The finite integer field mapping has a small remainder bias when the domain
size does not divide its capacity exactly; these percentages specify interval
weights rather than an exact empirical rate across human-selected keys.

## Recovery

Both encoder and decoder use the same weighted intervals. The writer randomly
selects an available representation of the intended alternative; the reader
maps it through the same intervals. Every supported choice has positive weight,
including large numbers. The rolling keyed feedback remains active. No number
is removed, shortened, or replaced after decoding to enforce these preferences.

The mapping now uses `pakupaku-grammar-stream-3-weighted-numbers`; policy is
included in the language fingerprint. Create fresh links. The explicit uniform
policy exists for controlled comparisons, while the UI uses weighted selection.
This remains an experimental custom codec, not a security certification.

## Measured comparison

The audit uses four input notes and 400 reader keys per stored packet, for
1,600 alternate readings per policy. Each policy's packets are saved in the
[evidence file](coverage/number-weight-audit.json), including their input notes.
They use fresh randomness; this is a descriptive experiment on these packets,
not a guarantee for every note or a measurement of general language coverage.

| Observation | Uniform control | Weighted selection |
| --- | ---: | ---: |
| Readings containing digits | 15 / 1,600 | 2 / 1,600 |
| Readings containing a numeric value at least 10,000 | 5 / 1,600 | 0 / 1,600 |
| Author recoveries | 4 / 4 | 4 / 4 |

The zero observed large-number readings does not mean large numbers are
impossible. Dedicated tests recover quantities up to 20 digits, as well as
small/medium values, monetary amounts, times, and dates. The complete automated
suite passes 73 tests.

Reproduce the comparison with `node tools/coverage/number-weight-audit.js`.
The control uses the same grammar and current implementation with uniform
weights; it is not a replay of historical packet bytes. The existing editor's
browser integration tests also exercise the weighted codec.
