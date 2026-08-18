/* =========================================================================
   Lesson 06 — narration script for the walkthrough.

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

   Written to be spoken, not read: contractions, fragments, one long
   sentence then a very short one. The punctuation is the pacing.

   Scenes, in lesson order:
     kd-soft (6 steps) · kd-temp (6) · kd-step (6) · kd-onpolicy (5) ·
     kd-unstruct (6) · kd-struct (6) · kd-24 (6)
   ========================================================================= */

window.NARRATION = window.NARRATION || {};

window.NARRATION['06'] = {
  title: 'Distillation: teacher to student',
  voice: 'alba',

  segments: [
    { id: 'a01',
      text: 'So. There are two honest ways to make a model smaller, and you will have both by the end of this. Train a small model with a big one\'s help. Or take the big one and cut real pieces out of it.',
      say: 'So. There are two honest ways to make a model smaller, and you\'ll have both by the end of this. Train a small model with a big one\'s help. Or take the big one and cut real pieces out of it.' },

    { id: 'a02', scene: 'kd-soft', step: 0,
      text: 'Let\'s start with a handwritten seven. What does the dataset tell us about it? One thing. Class seven is certain, every other class is impossible. That\'s the whole label.' },

    { id: 'a03', scene: 'kd-soft', step: 1,
      text: 'Now ask an already-trained teacher the same question. And honestly? At first it looks like the same fact, written less tidily. 0.93 on the seven, and the rest looks like noise.',
      say: 'Now ask an already trained teacher the same question. And honestly? At first it looks like the same fact, written less tidily. Zero point nine three on the seven, and the rest looks like noise.' },

    { id: 'a04', scene: 'kd-soft', step: 3,
      text: 'But it isn\'t. Eight more bars are not zero — they\'re only too short to see. So redraw the same ten numbers on a <b>log axis</b>, where each gridline is ten times smaller than the one above.' },

    { id: 'a05', scene: 'kd-soft', step: 4,
      text: 'And now the teacher is readable. It\'s telling you a seven resembles a one about a hundred times more than it resembles an eight. Nothing in the dataset ever says that. That ordering has a name: <b>dark knowledge</b>.' },

    { id: 'a06', scene: 'kd-temp', step: 0,
      text: 'Right. Six raw scores, straight from the teacher. Nothing from here on changes them — the only thing we change is the number we divide them by.' },

    { id: 'a07', scene: 'kd-temp', step: 1,
      text: 'At <b>τ = 1</b> this is the ordinary softmax. One class takes 0.904. The other five lie flat against the axis, and a gradient can barely feel them.',
      say: 'At a temperature of one, this is the ordinary softmax. One class takes zero point nine zero four. The other five lie flat against the axis, and a gradient can barely feel them.' },

    { id: 'a08', scene: 'kd-temp', step: 3,
      text: 'So turn the dial. At <b>τ = 4</b> the winner drops to 0.368. And look at the wrong answers — the gaps between them are now wide enough to carry a gradient. That\'s the whole trick.',
      say: 'So turn the dial. At a temperature of four, the winner drops to zero point three six eight. And look at the wrong answers. The gaps between them are now wide enough to carry a gradient. That\'s the whole trick.' },

    { id: 'a09', scene: 'kd-temp', step: 4,
      text: 'Push on to <b>τ = 10</b> and you\'ve gone too far. Every class sits near 0.17, and the teacher\'s ordering has dissolved.',
      say: 'Push on to a temperature of ten, and you\'ve gone too far. Every class sits near zero point one seven, and the teacher\'s ordering has dissolved.' },

    { id: 'a09b', scene: 'kd-temp', step: 5,
      text: 'So come back. Two to four, for classifiers. You\'re trading the teacher\'s confidence against its uncertainty, and you want both.' },

    { id: 'a10',
      text: 'Now the part that\'s easy to skip, and expensive to skip. Raise the temperature and this term\'s gradient collapses. From τ = 1 to τ = 2 it shrinks 3.3 times. From 2 to 4, another 3.8. Why? Two halvings, multiplied. That\'s the square.',
      say: 'Now the part that\'s easy to skip, and expensive to skip. Raise the temperature and this term\'s gradient collapses. From tau one to tau two, it shrinks three point three times. From two to four, another three point eight. Why? Two halvings, multiplied. That is the square.' },

    { id: 'a11',
      text: 'So multiply the KL term by <code>τ²</code>, and it holds still. At τ = 2, a raw KL of 0.0685 becomes 0.274. At τ = 4, 0.0174 becomes 0.278. The whole loss barely moves.',
      say: 'So multiply the K L term by tau squared, and it holds still. At tau two, a raw K L of zero point zero six eight five becomes zero point two seven four. At tau four, zero point zero one seven four becomes zero point two seven eight. The whole loss barely moves.' },

    { id: 'a12', scene: 'kd-step', step: 0,
      text: 'Here\'s one training step. The same batch goes into <b>two</b> models. And one hard requirement: they must share a tokenizer, because position 4,271 of the student\'s logits has to mean the same token as the teacher\'s.',
      say: 'Here is one training step. The same batch goes into two models. And one hard requirement. They must share a tokenizer, because position four thousand two hundred and seventy one of the student\'s logits has to mean the same token as the teacher\'s.' },

    { id: 'a13', scene: 'kd-step', step: 1,
      text: 'The teacher is <b>frozen</b>. Evaluation mode, gradients switched off, forward pass inside <code>no_grad</code>. Get that wrong and you build a tape for a model you will never update — and pay memory for it.',
      say: 'The teacher is frozen. Evaluation mode, gradients switched off, forward pass inside no grad. Get that wrong, and you build a tape for a model you will never update. And you pay memory for it.' },

    { id: 'a14', scene: 'kd-step', step: 2,
      text: 'The <b>KL term</b> compares the two full distributions. It grades every class at once, not just the right one. And notice which model is written first. The teacher. That\'s <b>forward</b> KL.',
      say: 'The K L term compares the two full distributions. It grades every class at once, not just the right one. And notice which model is written first. The teacher. That\'s forward K L.' },

    { id: 'a15', scene: 'kd-step', step: 4,
      text: 'Cross-entropy grades one number: the probability on the correct token. Then <b>α</b> weighs the two, and they collapse into a single number. 0.439. That\'s what <code>backward()</code> is called on.',
      say: 'Cross entropy grades one number, the probability on the correct token. Then alpha weighs the two, and they collapse into a single number. Zero point four three nine. That\'s what backward is called on.' },

    { id: 'a16', scene: 'kd-step', step: 5,
      text: 'And the gradient comes back to <b>the student only</b>. The teacher has nothing to fill in. It never learns a thing — which is exactly why you froze it.' },

    { id: 'a17', scene: 'kd-onpolicy', step: 0,
      text: 'Now a problem the classifier never had. Train a student only on the teacher\'s text, and it learns only in states the <em>teacher</em> would visit. Its first mistake at inference lands it somewhere it has never been. That\'s <b>exposure error</b>. So let the student write first.' },

    { id: 'a18', scene: 'kd-onpolicy', step: 1,
      text: 'Sampling isn\'t differentiable, so nothing tries to differentiate through it. Once those four tokens exist, they\'re fixed data. Exactly like a batch read from disk.' },

    { id: 'a19', scene: 'kd-onpolicy', step: 2,
      text: 'Now re-run the <b>student</b> over prompt plus completion, this time with gradient. And run the frozen teacher over that same fixed sequence. Once. One forward pass is the entire added cost.' },

    { id: 'a20', scene: 'kd-onpolicy', step: 3,
      text: 'Compare the two at every token — with the <b>student</b> written first. That\'s <b>reverse KL</b>. Forward KL charges a sharp student 1.59 for the mode it dropped, and only 0.36 for hedging. Reverse flips it: 0.63 against 0.91.',
      say: 'Compare the two at every token, with the student written first. That\'s reverse K L. Forward K L charges a sharp student one point five nine for the mode it dropped, and only zero point three six for hedging. Reverse flips it. Zero point six three, against zero point nine one.' },

    { id: 'a21', scene: 'kd-onpolicy', step: 4,
      text: 'And the gradient goes back to the student alone. Does it pay? Same checkpoint, same maths exam: reinforcement learning reached 67.6, in 17,920 GPU hours. On-policy distillation reached 74.4. In 1,800.',
      say: 'And the gradient goes back to the student alone. Does it pay? Same checkpoint, same maths exam. Reinforcement learning reached sixty seven point six, in seventeen thousand nine hundred and twenty G P U hours. On policy distillation reached seventy four point four. In one thousand eight hundred.' },

    { id: 'a22',
      text: 'But be honest about when <em>not</em> to do this. A stronger teacher can give you a <b>worse</b> student. It cannot represent the function it\'s being shown, so it cannot optimise toward it either. Bigger teacher is not automatically better. That\'s the capacity gap.' },

    { id: 'a23', scene: 'kd-unstruct', step: 0,
      text: 'Right. Now the other family: <b>pruning</b>. On the left, one <code>nn.Linear</code> weight matrix. On the right, four meters — how much of it you deleted, then bytes read, time per token, and file size.',
      say: 'Right. Now the other family. Pruning. On the left, one linear layer\'s weight matrix. On the right, four meters. How much of it you deleted, then bytes read, time per token, and file size.' },

    { id: 'a24', scene: 'kd-unstruct', step: 1,
      text: 'Rank every weight by size, and zero the smallest half. Half the numbers in that tensor are gone. Fifty per cent sparsity. Now watch the other three meters.' },

    { id: 'a25', scene: 'kd-unstruct', step: 3,
      text: 'Nothing. Bytes read, unchanged — the tensor is the same shape, so the memory system still reads every zero. Time per token, unchanged — a dense matrix multiply cheerfully multiplies by all of them.',
      say: 'Nothing. Bytes read, unchanged. The tensor is the same shape, so the memory system still reads every zero. Time per token, unchanged. A dense matrix multiply cheerfully multiplies by all of them.' },

    { id: 'a26', scene: 'kd-unstruct', step: 5,
      text: 'So say it plainly. <b>Unstructured sparsity is a research metric.</b> To make real hardware faster, you have to change the <b>shape</b>, not the values.' },

    { id: 'a27', scene: 'kd-struct', step: 0,
      text: 'So change the shape. Structured pruning starts by scoring every output row — and a good score uses the activations reaching that row, not just <code>|w|</code>. A small weight meeting a huge activation still matters.',
      say: 'So change the shape. Structured pruning starts by scoring every output row. And a good score uses the activations reaching that row, not just the size of the weight. A small weight meeting a huge activation still matters.' },

    { id: 'a28', scene: 'kd-struct', step: 2,
      text: 'The three weakest rows go, and the rest slide up. Nine rows became six. And <em>this</em> time the shape itself changed — every runtime feels that. No special kernel, no sparse format.' },

    { id: 'a29', scene: 'kd-struct', step: 3,
      text: 'But look at the plot on the right. The cut costs accuracy immediately, and the child now scores well below the parent it was carved out of. So is that it? No.' },

    { id: 'a30', scene: 'kd-struct', step: 4,
      text: 'You <b>heal</b>. Keep training the child, with the unpruned parent as its teacher. Minitron drops the label term completely here — <code>alpha = 0</code>, teacher only. Most of the loss comes back, and the model stays permanently smaller. Prune first, distil second.',
      say: 'You heal. Keep training the child, with the unpruned parent as its teacher. Minitron drops the label term completely here. Alpha equals zero, teacher only. Most of the loss comes back, and the model stays permanently smaller. Prune first, distil second.' },

    { id: 'a31', scene: 'kd-24', step: 1,
      text: 'There\'s a middle ground, and silicon designers made it exist. <b>2:4 sparsity</b>: in every group of four weights, exactly two must be zero. Fifty per cent sparsity, in a layout the chip can predict.',
      say: 'There is a middle ground, and silicon designers made it exist. Two of four sparsity. In every group of four weights, exactly two must be zero. Fifty per cent sparsity, in a layout the chip can predict.' },

    { id: 'a32', scene: 'kd-24', step: 2,
      text: 'Store only the survivors, and give each one a <b>2-bit index</b> saying which of the four slots it came from. Two bits. That\'s all it takes to name one of four.',
      say: 'Store only the survivors, and give each one a two bit index, saying which of the four slots it came from. Two bits. That\'s all it takes to name one of four.' },

    { id: 'a32b', scene: 'kd-24', step: 3,
      text: 'And here is what that index buys. Sparse tensor cores on Ampere and later read it, fetch only the survivors, and skip the discarded half entirely. Twice the arithmetic per clock. So the datasheet promises 2.00×.',
      say: 'And here is what that index buys. Sparse tensor cores, on Ampere and later, read it, fetch only the survivors, and skip the discarded half entirely. Twice the arithmetic per clock. So the datasheet promises two point zero zero times.' },

    { id: 'a33', scene: 'kd-24', step: 4,
      text: 'What people actually measure is smaller. 1.23× on BERT-Large, and about 1.4× on Llama-2-7B end to end.',
      say: 'What people actually measure is smaller. One point two three on BERT Large, and about one point four on Llama two, end to end.' },

    { id: 'a33b', scene: 'kd-24', step: 5,
      text: 'So 1.2 to 1.45 is the honest range — and only when the batch or the prompt is long enough to pay for the sparse kernel.',
      say: 'So one point two to one point four five is the honest range. And only when the batch or the prompt is long enough to pay for the sparse kernel.' },

    { id: 'a34',
      text: 'Now go and build it. Distil that 360M model into a 135M one. Then hunt for the uncomfortable number. 360 to 135 is only 2.7 times. The other 2 times is bytes — one byte a weight instead of two. Lesson 07 takes that much further.',
      say: 'Now go and build it. Distil that three hundred and sixty million model into a one hundred and thirty five million one. Then hunt for the uncomfortable number. Three sixty to one thirty five is only two point seven times. The other two times is bytes. One byte a weight instead of two. Lesson Seven takes that much further.' }
  ]
};
