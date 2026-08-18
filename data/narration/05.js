/* =========================================================================
   Lesson 05 — narration script for the walkthrough.

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

   Written to be SPOKEN, not read: contractions, fragments, questions that
   get answered, and a deliberate mix of long and very short sentences.
   Every number still matches the lesson exactly.
   ========================================================================= */

window.NARRATION = window.NARRATION || {};

window.NARRATION['05'] = {
  title: 'Fine-tuning and LoRA',
  voice: 'alba',

  segments: [
    { id: 'a01',
      text: 'Right. Somebody else already spent a month of expensive compute teaching a model to read and write. You are not repeating that. In the next few minutes you will change what that model <b>does</b> — by training less than one percent of its numbers.',
      say: 'Right. Somebody else already spent a month of expensive compute teaching a model to read and write. You are not repeating that. In the next few minutes you will change what that model does. By training less than one per cent of its numbers.' },

    { id: 'a02', scene: 'lo-memory', step: 0,
      text: 'So. Start with the bill. This is where people get caught. A 3.08 billion parameter model loads in bf16 for 6.2 GB. But training keeps a float32 copy — so the first bar is <b>12.3</b>.',
      say: 'So. Start with the bill. This is where people get caught. A three point oh eight billion parameter model loads in b f sixteen for six point two gigabytes. But training keeps a float thirty two copy. So the first bar is twelve point three.' },

    { id: 'a03', scene: 'lo-memory', step: 1,
      text: 'Now. Every single parameter needs its own <b>gradient</b>. That is the whole model again, stacked on top. Watch the bar double.',
      say: 'Now. Every single parameter needs its own gradient. That is the whole model again, stacked on top. Watch the bar double.' },

    { id: 'a04', scene: 'lo-memory', step: 2,
      text: 'And AdamW? It keeps <b>two</b> running averages of that gradient. For every parameter. So that is twice the model again — the tallest piece of the three.',
      say: 'And Adam W? It keeps two running averages of that gradient. For every parameter. So that is twice the model again. The tallest piece of the three.' },

    { id: 'a05', scene: 'lo-memory', step: 3,
      text: 'Forty nine point three gigabytes. And not one activation is stored yet. That dashed line is a sixteen gigabyte laptop. You are not close — and a free cloud card will not save you either.' },

    { id: 'a06', scene: 'lo-memory', step: 4,
      text: 'So here is <b>LoRA</b>. Freeze the base, and gradients and optimizer state exist only for the adapter. The tall part simply vanishes. 6.6 GB, with the frozen base sitting in bf16.',
      say: 'So here is LoRA. Freeze the base, and gradients and optimizer state exist only for the adapter. The tall part simply vanishes. Six point six gigabytes, with the frozen base sitting in b f sixteen.' },

    { id: 'a07', scene: 'lo-memory', step: 5,
      text: '<b>QLoRA</b> shrinks the last bar too — the frozen base stored in four bits. Two gigabytes for the whole run. One catch. The library that does the four-bit part is CUDA only, so it will not run on a Mac.',
      say: 'Q LoRA shrinks the last bar too. The frozen base, stored in four bits. Two gigabytes for the whole run. One catch. The library that does the four bit part is CUDA only, so it will not run on a Mac.' },

    { id: 'a08', scene: 'lo-lora', step: 0,
      text: 'So why does that middle bar collapse? Look inside one layer. One weight matrix — the query projection. <b>4,194,304</b> numbers. And full fine-tuning rewrites all of them.',
      say: 'So why does that middle bar collapse? Look inside one layer. One weight matrix. The query projection. Four million, one hundred and ninety four thousand, three hundred and four numbers. And full fine tuning rewrites all of them.' },

    { id: 'a09', scene: 'lo-lora', step: 1,
      text: 'LoRA <b>freezes</b> it. Not one number in there moves. Not one, for the entire run — and that tag means exactly what it says. No gradient ever arrives here.',
      say: 'LoRA freezes it. Not one number in there moves. Not one, for the entire run. And that tag means exactly what it says. No gradient ever arrives here.' },

    { id: 'a10', scene: 'lo-lora', step: 2,
      text: 'Beside it we put two thin matrices. <b>A</b> squeezes 2048 inputs down to sixteen. <b>B</b> expands those sixteen back to full width. Sixteen — that is the rank.',
      say: 'Beside it we put two thin matrices. The first one, A, squeezes two thousand and forty eight inputs down to sixteen. The second, B, expands those sixteen back to full width. Sixteen. That is the rank.' },

    { id: 'a11', scene: 'lo-lora', step: 3,
      text: 'And the two paths get added. The frozen path, plus the adapter path scaled by <b>alpha over r</b>. Every shape still matches, so nothing else in the model has to change.',
      say: 'And the two paths get added. The frozen path, plus the adapter path scaled by alpha divided by rank. Every shape still matches, so nothing else in the model has to change.' },

    { id: 'a12', scene: 'lo-lora', step: 4,
      text: 'Here is the elegant bit. <b>B starts as all zeros.</b> So at step zero the second path contributes exactly nothing, and the adapted model is the model you downloaded. There is no accuracy cliff.',
      say: 'Here is the elegant bit. B starts as all zeros. So at step zero the second path contributes exactly nothing, and the adapted model is the model you downloaded. There is no accuracy cliff.' },

    { id: 'a13', scene: 'lo-lora', step: 5,
      text: 'And only those two thin matrices receive gradients. <b>65,536</b> numbers instead of four million — 1.6% of this one matrix. Backward never touches the frozen block, and that is where the memory went.',
      say: 'And only those two thin matrices receive gradients. Sixty five thousand, five hundred and thirty six numbers instead of four million. One point six per cent of this one matrix. Backward never touches the frozen block, and that is where the memory went.' },

    { id: 'a14', scene: 'lo-rank', step: 0,
      text: 'So what is rank, really? It is the width of the bottleneck where those two thin matrices meet. A capacity dial. At four, they are barely a line beside the frozen block.' },

    { id: 'a15', scene: 'lo-rank', step: 1,
      text: 'Double it to eight, and both strips double with it. Trainable parameters grow <b>linearly</b> with rank — 1,889,280 of them per unit of rank, across all thirty six layers.',
      say: 'Double it to eight, and both strips double with it. Trainable parameters grow linearly with rank. One million, eight hundred and eighty nine thousand, two hundred and eighty of them per unit of rank, across all thirty six layers.' },

    { id: 'a16', scene: 'lo-rank', step: 2,
      text: 'Sixteen is where you start. That is 30.2 million trainable numbers — and look at the meter. Still <b>under one percent</b> of the model.',
      say: 'Sixteen is where you start. That is thirty point two million trainable numbers. And look at the meter. Still under one per cent of the model.' },

    { id: 'a17', scene: 'lo-rank', step: 3,
      text: 'Sixty four is a genuinely new task, not a change of style. 120.9 million numbers, 3.9%. The strips are visibly thick now, and gradients and optimizer state grow right along with them.',
      say: 'Sixty four is a genuinely new task, not a change of style. A hundred and twenty point nine million numbers. Three point nine per cent. The strips are visibly thick now, and gradients and optimizer state grow right along with them.' },

    { id: 'a18', scene: 'lo-rank', step: 4,
      text: 'Now — <b>alpha is not a second rank.</b> It only scales the adapter output, as alpha over r. That division keeps the best learning rate roughly independent of rank. Use two r, and pitch that rate ten times higher than a full fine-tune.',
      say: 'Now. Alpha is not a second rank. It only scales the adapter output, as alpha divided by rank. That division keeps the best learning rate roughly independent of rank. Use twice the rank, and pitch that rate ten times higher than a full fine tune.' },

    { id: 'a19', scene: 'lo-mask', step: 0,
      text: 'Right. Now the plumbing — and the plumbing is where fine-tunes actually fail. The chat template flattens your list of messages into one string of tokens. Those role markers are real tokens, not metadata.' },

    { id: 'a20', scene: 'lo-mask', step: 1,
      text: 'Train on that string as plain text, and every position gets graded. Read the little labels under the cells. Thirteen out of thirteen.' },

    { id: 'a21', scene: 'lo-mask', step: 2,
      text: 'But look what you just did. You taught it to write the <b>user\'s</b> half as well. That is the model that answers your question beautifully — and then cheerfully invents your next one.',
      say: 'But look what you just did. You taught it to write the user\'s half as well. That is the model that answers your question beautifully. And then cheerfully invents your next one.' },

    { id: 'a22', scene: 'lo-mask', step: 3,
      text: 'So switch assistant-only loss on. The prompt labels become <b>-100</b>, the ignore index, and cross-entropy skips those positions entirely. Watch the counter fall. Five graded tokens out of thirteen.',
      say: 'So switch assistant only loss on. The prompt labels become minus one hundred, the ignore index, and cross entropy skips those positions entirely. Watch the counter fall. Five graded tokens out of thirteen.' },

    { id: 'a23', scene: 'lo-mask', step: 4,
      text: 'And here is why it really matters. One long document, one short answer — 312 positions out of 1,024 carry a gradient. Without the mask you would spend all the rest on text the model never has to write.',
      say: 'And here is why it really matters. One long document, one short answer. Three hundred and twelve positions out of one thousand and twenty four carry a gradient. Without the mask you would spend all the rest on text the model never has to write.' },

    { id: 'a24',
      text: 'One more stage exists after this one. <b>DPO</b> — direct preference optimization. It learns from pairs of answers, one marked better than the other, and it pushes the gap between them. Worth recognising on a model card. Your project stops before it.',
      say: 'One more stage exists after this one. D P O. Direct preference optimization. It learns from pairs of answers, one marked better than the other, and it pushes the gap between them. Worth recognising on a model card. Your project stops before it.' },

    { id: 'a25', scene: 'lo-forget', step: 0,
      text: 'Now the thing almost nobody measures. Two scores matter here, not one. How good the model is at <b>your task</b>, and how good it is at <b>everything else</b>. Record both before you train a single step.',
      say: 'Now the thing almost nobody measures. Two scores matter here, not one. How good the model is at your task, and how good it is at everything else. Record both before you train a single step.' },

    { id: 'a26', scene: 'lo-forget', step: 1,
      text: 'The task score climbs. Of course it does — that is what you trained for. And for most people, this is the only curve they ever write down.' },

    { id: 'a27', scene: 'lo-forget', step: 2,
      text: 'And the other one falls. The weights moved toward your narrow data, so ordinary conversation got worse. Those panel numbers are illustrative, but the shape is real. Nothing warns you, because your evaluation set never tests it.' },

    { id: 'a28', scene: 'lo-forget', step: 3,
      text: 'The cheap defence is <b>replay</b>. Mix one to ten percent of general instruction data back into your set. Same task score. And in the sketch on the right, the fall nearly flattens.',
      say: 'The cheap defence is replay. Mix one to ten per cent of general instruction data back into your set. Same task score. And in the sketch on the right, the fall nearly flattens.' },

    { id: 'a29', scene: 'lo-forget', step: 4,
      text: 'But none of this is visible unless you look. Three general prompts, answered before and answered again after. Five minutes. That is the whole ritual, and it is the only way you will notice.' },

    { id: 'a30', scene: 'lo-merge', step: 0,
      text: 'Training is over. The base never moved, so what you actually have is an adapter file — 30.2 million numbers, about 60 MB, sitting beside a 6.2 GB base.',
      say: 'Training is over. The base never moved, so what you actually have is an adapter file. Thirty point two million numbers, about sixty megabytes, sitting beside a six point two gigabyte base.' },

    { id: 'a31', scene: 'lo-merge', step: 1,
      text: 'You can serve it exactly like that. The price is two extra matrix multiplies per targeted layer, on every token. Or — you merge. Multiply <b>B</b> by <b>A</b> once, apply the scale, and the product has exactly the shape of the frozen matrix.',
      say: 'You can serve it exactly like that. The price is two extra matrix multiplies per targeted layer, on every token. Or you merge. Multiply B by A once, apply the scale, and the product has exactly the shape of the frozen matrix.' },

    { id: 'a32', scene: 'lo-merge', step: 2,
      text: 'Add it into the frozen weights, and out comes an <b>ordinary weight matrix</b>. Watch the adapter fade. There is nothing left to attach any more.',
      say: 'Add it into the frozen weights, and out comes an ordinary weight matrix. Watch the adapter fade. There is nothing left to attach any more.' },

    { id: 'a33', scene: 'lo-merge', step: 3,
      text: 'One multiply again. The base model\'s shape, file size and speed. Keep this file — Lesson Nine exports it, and the export tools follow one graph of ordinary weights, not a base plus a separate adapter.' },

    { id: 'a34',
      text: 'So. Go and do the project. Build the evaluation set <b>before</b> you train, then measure what you gained and what you quietly lost. In Lesson Six the model gets genuinely smaller — distillation copies a big model\'s confidence into a small student.',
      say: 'So. Go and do the project. Build the evaluation set before you train, then measure what you gained and what you quietly lost. In Lesson Six the model gets genuinely smaller. Distillation copies a big model\'s confidence into a small student.' }
  ]
};
