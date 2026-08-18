/* =========================================================================
   Lesson 04 — narration script for the walkthrough.

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

   Written to be spoken, not read: contractions, fragments, questions
   answered out loud. A full stop is a beat, so punctuation is the pacing.
   ========================================================================= */

window.NARRATION = window.NARRATION || {};

window.NARRATION['04'] = {
  title: 'Train your own tiny GPT',
  voice: 'alba',

  segments: [
    { id: 'a01',
      text: 'So. The whole job of pretraining, in a few minutes. Where the labels come from. What the loss should read at step zero. How many hours the run costs. And how to spot a broken run early.' },

    { id: 'a02', scene: 'gpt-objective', step: 0,
      text: 'This is one training example. Not one word. Not one sentence. A whole block of token ids — six here, so it fits on screen. Two hundred and fifty-six in your project.',
      say: 'This is one training example. Not one word. Not one sentence. A whole block of token ids. Six here, so it fits on screen. Two hundred and fifty six in your project.' },

    { id: 'a03', scene: 'gpt-objective', step: 1,
      text: 'Watch what one forward pass does. Every position produces a prediction, all at the same time, not only the last one. And they\'re all nonsense, because the weights are still random.' },

    { id: 'a04', scene: 'gpt-objective', step: 2,
      text: 'So where do the labels come from? Copy the input row, and slide the copy one place left. That\'s the whole labelling step. No annotator. No label file. The text labels itself.' },

    { id: 'a05', scene: 'gpt-objective', step: 3,
      text: 'The slide leaves two gaps. The first token is nobody\'s target, and the last position has no target. Which is why a block of two hundred and fifty-six tokens trains on two hundred and fifty-five positions.',
      say: 'The slide leaves two gaps. The first token is nobody\'s target, and the last position has no target. Which is why a block of two hundred and fifty six tokens trains on two hundred and fifty five positions.' },

    { id: 'a06', scene: 'gpt-objective', step: 5,
      text: 'And here\'s the number you can predict before you run anything. Average those losses, and a fresh model sits at the natural log of the vocabulary size. Ours is 4,096. So the loss starts at <b>8.32</b>.',
      say: 'Here is the number you can predict before you run anything. Average those losses, and a fresh model sits at the natural log of the vocabulary size. Ours is four thousand and ninety six, so the loss starts at eight point three two.' },

    { id: 'a07', scene: 'gpt-objective', step: 6,
      text: 'None of this is legal without the causal mask from Lesson Three. Position two cannot see token three. So its prediction is real, not a copy of the answer next to it.' },

    { id: 'a08', scene: 'gpt-packing', step: 1,
      text: 'Documents come in random lengths, and a batch has to be a rectangle. So the naive fix is padding. Look at the grey cells. Each costs a full matrix multiply and gives back nothing. Thirty-eight per cent of the batch, burned.',
      say: 'Documents come in random lengths, and a batch has to be a rectangle. So the naive fix is padding. Look at the grey cells. Each costs a full matrix multiply and gives back nothing. Thirty eight per cent of the batch, burned.' },

    { id: 'a09', scene: 'gpt-packing', step: 2,
      text: 'Packing throws that away. Pour every document into one long stream, with an end-of-text token between them so the model knows where a story stops. Watch the counter. Wasted tokens, zero.' },

    { id: 'a10', scene: 'gpt-packing', step: 3,
      text: 'Then cut the stream every <b>T</b> tokens. Six here, two hundred and fifty-six in the project. Yes, document C gets cut across the boundary. The model just learns from both halves — and for pretraining, that\'s a price worth paying.',
      say: 'Then cut the stream into equal blocks. Six tokens here, two hundred and fifty six in the project. Yes, document C gets cut across the boundary. The model learns from both halves, and for pretraining that price is worth paying.' },

    { id: 'a11', scene: 'gpt-step', step: 1,
      text: 'Your device holds thirty-two blocks at a time, and one honest step wants far more. So run eight micro-batches and call backward on each. PyTorch adds into the gradient buffer instead of replacing it — Lesson One called that a trap. Here, it\'s the feature.' },

    { id: 'a12', scene: 'gpt-step', step: 2,
      text: 'Then <b>one</b> optimizer step, on the average of all eight. That\'s 65,536 tokens in a single update. Memory paid for thirty-two rows. The step behaves as if you\'d trained on two hundred and fifty-six.',
      say: 'Then one optimizer step, on the average of all eight. Sixty five thousand, five hundred and thirty six tokens in a single update. Memory paid for thirty two rows. The step behaves as if you had trained on two hundred and fifty six.' },

    { id: 'a13', scene: 'gpt-step', step: 3,
      text: 'One guard comes before that step. Take every gradient in the model, treat the whole lot as a single long vector, and measure its length. Today, it\'s 4.0. Too long.',
      say: 'One guard comes before that step. Take every gradient in the model, treat the whole lot as a single long vector, and measure its length. Today, it is four point zero. Too long.' },

    { id: 'a14', scene: 'gpt-step', step: 4,
      text: 'The limit is 1.0, so scale everything by one over four — a factor of 0.25. A gradient of −3.2 becomes −0.8. One of +0.4 becomes +0.1. The ratio never moves. Same direction, shorter. That\'s clipping.',
      say: 'The limit is one point zero, so scale everything by one over four. A gradient of minus three point two becomes minus zero point eight. One of plus zero point four becomes plus zero point one. The ratio never moves. Same direction, shorter. That is clipping.' },

    { id: 'a14b',
      text: 'And the learning rate is not a constant. At step zero the weights are random, so a full-size step throws them somewhere useless. <b>Warmup</b> raises the rate from near zero over the first two hundred steps.' },

    { id: 'a14c',
      text: 'Then cosine decay takes it down, from a peak of <b>1e-3</b> to a floor a tenth of that. Big steps early, small ones to settle.',
      say: 'Then cosine decay takes it down, from a peak of one times ten to the minus three to a floor a tenth of that. Big steps early, small ones to settle.' },

    { id: 'a15', scene: 'gpt-loss', step: 0,
      text: 'Now, the curve you\'ll stare at for hours. Step zero is not a mystery. Draw a line at the natural log of your vocabulary. Your first logged loss should land on it. If it doesn\'t, stop. Something is already wrong.' },

    { id: 'a16', scene: 'gpt-loss', step: 1,
      text: 'The first few hundred steps fall almost vertically, and it feels wonderful. Then read the sample beside them. All the model has learned is which tokens are common. That part is free.' },

    { id: 'a17', scene: 'gpt-loss', step: 3,
      text: 'And this is the part that matters. By the end the loss is barely moving — and that is exactly where real sentences turn up. The flattest stretch of the curve is the stretch a reader notices.' },

    { id: 'a17b', scene: 'gpt-loss', step: 4,
      text: 'But one shape means stop the run. A spike a few steps <b>after</b> warmup ends means the peak was always too high. Lower it, or lengthen the warmup. Leave the floor alone.' },

    { id: 'a18', scene: 'gpt-loss', step: 5,
      text: 'One honesty check before we move on. On a linear axis the run looks dead after the first fifth. Plot the same numbers against <b>log(tokens)</b> and they straighten right out. That line is the scaling law.',
      say: 'One honesty check. On a linear axis the run looks dead after the first fifth. Plot the same numbers against the logarithm of tokens seen, and they straighten right out. That line is the scaling law.' },

    { id: 'a19', scene: 'gpt-budget', step: 1,
      text: 'So how long does this cost you? Start with <b>N</b>, the parameter count. Only non-embedding parameters go in, because an embedding is a lookup, not a matrix multiply. Here, 14.2 million.',
      say: 'So how long does this cost you? Start with N, the parameter count. Only non embedding parameters go in, because an embedding is a lookup, not a matrix multiply. Here, fourteen point two million.' },

    { id: 'a20', scene: 'gpt-budget', step: 2,
      text: 'Now <b>D</b>, the number of training tokens. Chinchilla says the compute-optimal choice is about twenty tokens per parameter. Twenty times 14.2 million is 284 million. Divide by tokens per step: 4,300 steps.',
      say: 'Now D, the number of training tokens. Chinchilla says the compute optimal choice is about twenty tokens per parameter. Twenty times fourteen point two million is two hundred and eighty four million. Divide by tokens per step: four thousand three hundred steps.' },

    { id: 'a21', scene: 'gpt-budget', step: 3,
      text: 'Compute is six times N times D. Two operations per parameter per token going forward, four coming back. That\'s 2.4e16 FLOPs. A free T4 sustains about 3.3 trillion per second on a model this small. So — two hours.',
      say: 'Compute is six times N times D. Two operations per parameter per token going forward, four coming back. That is two point four times ten to the sixteen floating point operations. A free T four sustains about three point three trillion per second on a model this small. So. Two hours.' },

    { id: 'a22', scene: 'gpt-budget', step: 5,
      text: 'But Chinchilla answers the wrong question for a phone. You pay training once and inference millions of times, so you overtrain on purpose. SmolLM3 sits at about 3,700 tokens per parameter — a hundred and eighty-five times past optimal. Not a mistake. Economics.',
      say: 'But Chinchilla answers the wrong question for a phone. You pay training once, and inference millions of times, so you overtrain on purpose. Smol L M three sits at about three thousand seven hundred tokens per parameter. A hundred and eighty five times past optimal. Not a mistake. Economics.' },

    { id: 'a23', scene: 'gpt-sampling', step: 0,
      text: 'Training is finished. Now the model hands you a probability for every token in the vocabulary, and something has to choose one. After this prompt, these are the eight largest.' },

    { id: 'a24', scene: 'gpt-sampling', step: 1,
      text: 'Greedy takes the tallest bar. Every single time. It never surprises you, and that is precisely its problem. It falls into loops and repeats whole phrases.' },

    { id: 'a25', scene: 'gpt-sampling', step: 2,
      text: 'Temperature divides the logits before the softmax. We write it tau, because T is already the block length. Watch the bars. Below one the distribution sharpens towards greedy. Above one it flattens, and unlikely tokens get a real chance.' },

    { id: 'a26', scene: 'gpt-sampling', step: 3,
      text: 'Top-k keeps a fixed number of bars, deletes the rest, and shares their probability among the survivors. Here k is three, so five tokens simply vanish. In practice people use twenty.',
      say: 'Top K keeps a fixed number of bars, deletes the rest, and shares their probability among the survivors. Here K is three, so five tokens vanish. In practice, people use twenty.' },

    { id: 'a27', scene: 'gpt-sampling', step: 4,
      text: 'Top-p keeps the shortest list whose probabilities reach p. Here that takes five tokens, because the model isn\'t sure. So the length of the list follows the model, instead of being fixed by you.',
      say: 'Top P keeps the shortest list whose probabilities add up to P. Here that takes five tokens, because the model is not sure. The length of the list follows the model, instead of being fixed by you.' },

    { id: 'a28', scene: 'gpt-sampling', step: 5,
      text: 'Now change the prompt to "Once upon a", where the model is certain. "time" gets 0.94. Top-p keeps one token. Top-k still keeps three, and two are wrong. That is why top-p is your default.',
      say: 'Now change the prompt to, once upon a, where the model is certain. The word time gets zero point nine four. Top P keeps one token. Top K still keeps three, and two are wrong. That is why top P is your default.' },

    { id: 'a29', scene: 'gpt-decode', step: 0,
      text: 'One last idea, and it decides how your model feels to use. Generation is two jobs, not one. The first is <b>prefill</b>: it reads the prompt.' },

    { id: 'a30', scene: 'gpt-decode', step: 1,
      text: 'All five positions go through the model in a single pass. Big matrix multiplies, many rows at once, so the chip is genuinely busy. This is what sets your time to first token.' },

    { id: 'a31', scene: 'gpt-decode', step: 2,
      text: 'Every layer keeps the keys and values it just computed. No position can depend on a later one, so those numbers are final. Compute them once, store them, never again. That store is the <b>KV cache</b>.',
      say: 'Every layer keeps the keys and values it just computed. No position can depend on a later one, so those numbers are final. Compute them once, store them, never again. That store is the K V cache.' },

    { id: 'a32', scene: 'gpt-decode', step: 3,
      text: 'Now <b>decode</b>. One token per pass, forever. Each pass adds one column, in every layer. The arithmetic is tiny — but every weight in the model must travel from memory to the chip to make that one token. Decode waits for memory, not maths.',
      say: 'Now decode. One token per pass, forever. Each pass adds one column, in every layer. The arithmetic is tiny. But every weight in the model must travel from memory to the chip to make that one token. Decode waits for memory, not maths.' },

    { id: 'a33', scene: 'gpt-decode', step: 5,
      text: 'And the cache is not free. For this model, 12 KiB per token, so a full 256-token context costs 3 MiB. Watch the meter climb. On a phone it\'s usually the cache, not the weights, that runs out first.',
      say: 'And the cache is not free. For this model, twelve kibibytes per token, so a full two hundred and fifty six token context costs three mebibytes. Watch the meter climb. On a phone it is usually the cache, not the weights, that runs out first.' },

    { id: 'a34',
      text: 'So — go and train it. 15.7 million parameters, 4,300 steps, then break it four ways on purpose, because recognising the failures is worth more than the model. Then Lesson Five: a model somebody else paid to pretrain, taught to follow instructions by changing under one per cent of its weights.',
      say: 'So. Go and train it. Fifteen point seven million parameters, four thousand three hundred steps. Then break it four ways on purpose, because recognising the failures is worth more than the model. Then Lesson Five: a model somebody else paid to pretrain, taught to follow instructions by changing under one per cent of its weights.' }
  ]
};
