/* =========================================================================
   Lesson 07 — narration script for the walkthrough.

   Each segment:
     id     stable, short. The audio timings are keyed on it, so do not
            renumber existing ids when you insert a new segment.
     text   the caption. Light <b> emphasis is fine.
     say    optional. What the voice actually reads, when the caption
            contains something a speech model would mangle — symbols,
            code, abbreviations. If absent, the caption is read with its
            tags stripped.
     scene  which figure to bring on stage, and
     step   which of its steps to play. Omit both for a title card.

   Write for the ear: short sentences, one idea each, no brackets, and no
   symbols the voice cannot say.
   ========================================================================= */

window.NARRATION = window.NARRATION || {};

window.NARRATION['07'] = {
  title: 'Quantization: fewer bits',
  voice: 'alba',

  segments: [
    { id: 'a01',
      text: 'Welcome to Lesson Seven. By the end of this you can take a model, put it in a container four to eight times smaller, and say exactly what that cost. In megabytes. In perplexity. And in the one ability that always breaks first.',
      say: 'Welcome to Lesson seven. By the end of this you can take a model, put it in a container four to eight times smaller, and say exactly what that cost. In megabytes. In perplexity. And in the one ability that always breaks first.' },

    { id: 'a02', scene: 'q-levels', step: 0,
      text: 'So. One weight. One real number, sitting somewhere on a line. In <b>FP32</b> that line is chopped so finely we can just call it continuous — whatever value you want, you can have it.',
      say: 'So. One weight. One real number, sitting somewhere on a line. In thirty two bit floating point, that line is chopped so finely we can just call it continuous. Whatever value you want, you can have it.' },

    { id: 'a03', scene: 'q-levels', step: 1,
      text: 'Now squeeze that same range into eight bits. <b>256</b> levels. The steps are so small the weight hardly has to move. It lands on 0.6314, and the error is 0.0014. Nothing to worry about.',
      say: 'Now squeeze that same range into eight bits. Two hundred and fifty six levels. The steps are so small the weight hardly has to move. It lands on zero point six three one four, and the error is zero point zero zero one four. Nothing to worry about.' },

    { id: 'a04', scene: 'q-levels', step: 2,
      text: 'Four bits gives you <b>16</b>. Watch it jump. The weight has to leave 0.63 and land on 0.60 — an error of 0.03. More than fifteen times worse, from four bits fewer.',
      say: 'Four bits gives you sixteen. Watch it jump. The weight has to leave zero point six three and land on zero point six. An error of zero point zero three. More than fifteen times worse, from four bits fewer.' },

    { id: 'a05', scene: 'q-levels', step: 4,
      text: 'And there is the whole trade. Take away one bit, and you <b>halve</b> the levels, double the step, and double the worst error you can make.',
      say: 'And there is the whole trade. Take away one bit, and you halve the levels, double the step, and double the worst error you can make.' },

    { id: 'a06', scene: 'q-memory', step: 0,
      text: 'Right. So what does that buy you? Take the 360-million-parameter model you fine-tuned in Lesson 05. Four bytes a weight, and it is <b>1440 MB</b>. Nothing about the model has changed yet.',
      say: 'Right. So what does that buy you? Take the three hundred and sixty million parameter model you fine tuned in Lesson five. Four bytes a weight, and it is fourteen hundred and forty megabytes. Nothing about the model has changed yet.' },

    { id: 'a07', scene: 'q-memory', step: 1,
      text: '<b>BF16</b> halves it. 720 MB. And here is the neat part. It keeps the same exponent as FP32, so the <b>range</b> is identical. Only the precision drops.',
      say: 'Brain float sixteen halves it. Seven hundred and twenty megabytes. And here is the neat part. It keeps the same exponent as thirty two bit floating point, so the range is identical. Only the precision drops.' },

    { id: 'a08', scene: 'q-memory', step: 3,
      text: 'Eight-bit integers give 360 MB, and for weight-only quantization that one is close to free. And INT4 gives <b>191 MB</b>. But look at the label. 4.25 bits. Not 4.',
      say: 'Eight bit integers give three hundred and sixty megabytes, and for weight only quantization that one is close to free. And four bit integers give one hundred and ninety one megabytes. But look at the label. Four point two five bits. Not four.' },

    { id: 'a09', scene: 'q-memory', step: 4,
      text: 'Why 4.25? Because every group of 128 weights carries a scale and a zero point. Four-bit is never four bits. And this is the number that matters on a phone, because generating one token reads <b>every one of these bytes</b>.',
      say: 'Why four point two five? Because every group of one hundred and twenty eight weights carries a scale and a zero point. Four bit is never four bits. And this is the number that matters on a phone, because generating one token reads every one of these bytes.' },

    { id: 'a10', scene: 'q-roundtrip', step: 0,
      text: 'So how does a weight actually get into four bits? Here is one. <b>0.55</b>. That is the only real number in this picture. Everything else you are about to see is bookkeeping.',
      say: 'So how does a weight actually get into four bits? Here is one. Zero point five five. That is the only real number in this picture. Everything else you are about to see is bookkeeping.' },

    { id: 'a11', scene: 'q-roundtrip', step: 2,
      text: 'Pick a scale — the size of one step. Here <b>s = 0.25</b>, and the values you can store are its multiples. Our weight is not on one of them. So divide: 0.55 over 0.25 is <b>2.2</b> steps up from zero.',
      say: 'Pick a scale. The size of one step. Here it is zero point two five, and the values you can store are its multiples. Our weight is not on one of them. So divide. Zero point five five over zero point two five is two point two steps up from zero.' },

    { id: 'a12', scene: 'q-roundtrip', step: 3,
      text: 'Now round. <b>2</b>. And this is the part that matters. That one rounding is the <b>only</b> lossy step in the entire method. Everything either side of it is exact.',
      say: 'Now round. Two. And this is the part that matters. That one rounding is the only lossy step in the entire method. Everything either side of it is exact.' },

    { id: 'a13', scene: 'q-roundtrip', step: 4,
      text: 'Store the 2. Four bits hold 16 codes. But symmetric quantization uses only 15 of them, −7 to 7, so that zero lands exactly in the middle. Write a kernel that uses all 16 and it will be quietly, slightly wrong.',
      say: 'Store the two. Four bits hold sixteen codes. But symmetric quantization uses only fifteen of them, minus seven up to seven, so that zero lands exactly in the middle. Write a kernel that uses all sixteen, and it will be quietly, slightly wrong.' },

    { id: 'a14', scene: 'q-roundtrip', step: 5,
      text: 'To read it back, multiply by the scale. 0.25 × 2 = <b>0.50</b>. In went 0.55, out came 0.50. That missing 0.05 is the quantization error, and it can never be worse than half a step. 0.125.',
      say: 'To read it back, multiply by the scale. Zero point two five, times two, is zero point five. In went zero point five five. Out came zero point five. That missing zero point zero five is the quantization error, and it can never be worse than half a step. Zero point one two five.' },

    { id: 'a15', scene: 'q-grain', step: 1,
      text: 'Now. How many scales do you keep? <b>Per-tensor</b> is one scale for the whole matrix. Free in memory, and the most fragile thing you can do. One large weight, anywhere, sets the step size for all 16.7 million of them.',
      say: 'Now. How many scales do you keep? Per tensor means one scale for the whole matrix. Free in memory, and the most fragile thing you can do. One large weight, anywhere, sets the step size for all sixteen point seven million of them.' },

    { id: 'a16', scene: 'q-grain', step: 2,
      text: '<b>Per-row</b>: one scale for every output row. In a 4096 × 4096 layer that is 4096 extra numbers, 16 bits each, spread over 16.8 million weights. <b>0.004</b> extra bits per weight. And now no row can damage another.',
      say: 'Per row. One scale for every output row. In a layer of four thousand and ninety six rows and columns, that is four thousand and ninety six extra numbers, sixteen bits each, spread over sixteen point eight million weights. Zero point zero zero four extra bits per weight. And no row can damage another.' },

    { id: 'a17', scene: 'q-grain', step: 3,
      text: '<b>Per-group</b>: split each row again. One scale per 128 weights costs a quarter of a bit. That is 131,072 scales in that one layer, and it is the standard choice for INT4.',
      say: 'Per group. Split each row again. One scale for every one hundred and twenty eight weights costs a quarter of a bit. That is a hundred and thirty one thousand and seventy two scales, in that one layer. And it is the standard choice for four bit integers.' },

    { id: 'a18', scene: 'q-grain', step: 4,
      text: 'Group 32 is more accurate still. But now the metadata costs a <b>whole extra bit</b> per weight, and the kernel reloads a scale four times as often, which may put you on a slower path. Accuracy and speed do not always move together. So measure both.',
      say: 'Group thirty two is more accurate still. But now the metadata costs a whole extra bit per weight. And the kernel reloads a scale four times as often, which may put you on a slower code path. Accuracy and speed do not always move together. So measure both.' },

    { id: 'a19', scene: 'q-outlier', step: 0,
      text: 'Right. Now the thing that ruins all of it. Eight weights from one group. Those dashed lines are the 15 values symmetric INT4 can store.',
      say: 'Right. Now the thing that ruins all of it. Eight weights from one group. Those dashed lines are the fifteen values symmetric four bit integers can store.' },

    { id: 'a20', scene: 'q-outlier', step: 1,
      text: 'The scale comes from the largest magnitude. 1.75 over 7 is <b>0.25</b>. Every weight lands on a line close to where it started, and the worst error is 0.12. Comfortably inside half a step.',
      say: 'The scale comes from the largest magnitude. One point seven five, over seven, is zero point two five. Every weight lands on a line close to where it started, and the worst error is zero point one two. Comfortably inside half a step.' },

    { id: 'a21', scene: 'q-outlier', step: 2,
      text: 'Now change one weight. 1.75 becomes <b>17.50</b>. One value. Nothing else in the group moves at all. Now watch the other seven.',
      say: 'Now change one weight. One point seven five becomes seventeen point five. One value. Nothing else in the group moves at all. Now watch the other seven.' },

    { id: 'a22', scene: 'q-outlier', step: 3,
      text: 'The ruler is ten times coarser. The scale went from 0.25 to 2.50, and <b>seven of the eight weights round to exactly zero</b>. One outlier destroyed the group.',
      say: 'The ruler is ten times coarser. The scale went from zero point two five, to two point five. And seven of the eight weights now round to exactly zero. One outlier destroyed the group.' },

    { id: 'a23', scene: 'q-outlier', step: 4,
      text: 'So what is the fix? Granularity. Give each group of four its own scale. The outlier is trapped in group 1. Group 2 gets a scale of 0.17. And its weights come straight back.',
      say: 'So what is the fix? Granularity. Give each group of four its own scale. The outlier is trapped in group one. Group two gets a scale of zero point one seven. And its weights come straight back.' },

    { id: 'a24', scene: 'q-outlier', step: 5,
      text: 'Weights rarely look like this. <b>Activations do.</b> Past about 6.7 billion parameters, roughly 6 feature dimensions carry values twenty times larger than everything else. In every layer. In the same dimensions. Set that 0.1% to zero and perplexity degrades by 600%.',
      say: 'Weights rarely look like this. Activations do. Past about six point seven billion parameters, roughly six feature dimensions carry values twenty times larger than everything else. In every layer. In the same dimensions. Set that nought point one per cent to zero, and perplexity degrades by six hundred per cent.' },

    { id: 'a25', scene: 'q-ste', step: 0,
      text: 'Usually you quantize a finished model and accept the rounding. When you cannot, one move remains. Let the model keep training while it can <b>feel</b> that rounding. In QAT the forward pass rounds on purpose, and the weights stay in floating point.',
      say: 'Usually you quantize a finished model and just accept the rounding. When you cannot, one move remains. Let the model keep training while it can feel that rounding. In quantization aware training the forward pass rounds on purpose, and the weights stay in floating point.' },

    { id: 'a26', scene: 'q-ste', step: 2,
      text: 'But here is the obstacle. <b>round()</b> is flat between its steps, so its derivative is exactly zero almost everywhere. Differentiate that node honestly and every gradient gets multiplied by zero. Nothing trains. Nothing moves at all.',
      say: 'But here is the obstacle. Rounding is flat between its steps, so its derivative is exactly zero, almost everywhere. Differentiate that node honestly, and every gradient gets multiplied by zero. Nothing trains. Nothing moves at all.' },

    { id: 'a27', scene: 'q-ste', step: 3,
      text: 'The <b>straight-through estimator</b> is the fix, and it is a deliberate lie about the backward pass. You pretend the rounding was the identity function. A straight line. Slope 1.',
      say: 'The straight through estimator is the fix, and it is a deliberate lie about the backward pass. You pretend the rounding was the identity function. A straight line. Slope one.' },

    { id: 'a28', scene: 'q-ste', step: 4,
      text: 'So the gradient reaches <b>w</b> unchanged inside the clipping range, and the weight learns to sit where rounding hurts least. One line of PyTorch. And expect it to win back a third to two thirds of what four bits cost you.',
      say: 'So the gradient reaches the weight unchanged inside the clipping range, and the weight learns to sit where rounding hurts least. One line of PyTorch. And expect it to win back a third to two thirds of what four bits cost you.' },

    { id: 'a29', scene: 'q-damage', step: 0,
      text: 'Now the part most tutorials skip. Quantization fails <b>silently</b>. The model loads, it writes fluent text, and it is quietly a little worse. So. Five formats of one model. Perplexity on the left. On the right, how far each score moved. Right is worse.',
      say: 'Now the part most tutorials skip. Quantization fails silently. The model loads, writes fluent text, and is quietly a little worse. So. Five formats of one model. Perplexity on the left. On the right, how far each score moved from the baseline. Right is worse.' },

    { id: 'a30', scene: 'q-damage', step: 1,
      text: 'Eight-bit, weight-only. Perplexity moves by 0.01. GSM8K moves a tenth of a point, and HellaSwag does not move at all. This is what <b>free</b> looks like, and it is why 8-bit is always your first step.',
      say: 'Eight bit, weight only. Perplexity moves by one hundredth. The grade school maths benchmark moves a tenth of a point, and the common sense one does not move at all. This is what free looks like. And it is why eight bit is always your first step.' },

    { id: 'a31', scene: 'q-damage', step: 2,
      text: 'Now look at this row. <b>Q5_0</b> scores 1.5 points <b>higher</b> on GSM8K than the FP16 model did. A quantized model cannot really be better. So that bar is not a win. It is the size of your measurement noise.',
      say: 'Now look at this row. The five bit format scores one point five points higher on the grade school maths benchmark than the sixteen bit model did. A quantized model cannot really be better. So that bar is not a win. It is the size of your measurement noise.' },

    { id: 'a32', scene: 'q-damage', step: 4,
      text: 'Now three bits. Perplexity climbs from 7.32 up to <b>8.96</b>. And watch those two bars come apart.',
      say: 'Now three bits. Perplexity climbs from seven point three two, up to eight point nine six. And now watch those two bars come apart.' },

    { id: 'a33', scene: 'q-damage', step: 5,
      text: '<b>GSM8K</b> loses 9.3 points. <b>HellaSwag</b> loses 0.6. Reasoning degrades first. Recall and common sense degrade last. And perplexity on its own would never have told you which ability you just spent.',
      say: 'The grade school maths benchmark loses nine point three points. The common sense one loses zero point six. Reasoning degrades first. Recall and common sense degrade last. And perplexity, on its own, would never have told you which ability you just spent.' },

    { id: 'a34',
      text: 'So. Your project. Take that Lesson 05 model from 1440 MB down to about 191 MB, and produce one table: bits per weight, megabytes, perplexity, one task score, tokens per second. Then Lesson 08, because smaller is not faster. So far you have assumed that speed-up. Lesson 08 makes you measure it.',
      say: 'So. Your project. Take that Lesson five model from fourteen hundred and forty megabytes down to about one hundred and ninety one, and produce one table. Bits per weight, megabytes, perplexity, one task score, tokens per second. Then Lesson eight, because smaller is not faster. So far you have assumed that speed up. Lesson eight makes you measure it.' }
  ]
};
