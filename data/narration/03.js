/* =========================================================================
   Lesson 03 — narration script for the walkthrough.

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

   Write for the ear: this is a person teaching, not a document read aloud.
   Contractions, discourse markers, fragments for emphasis, a long sentence
   and then a very short one. No symbols the voice cannot say.
   ========================================================================= */

window.NARRATION = window.NARRATION || {};

window.NARRATION['03'] = {
  title: 'Inside a Transformer',
  voice: 'alba',

  segments: [
    { id: 'a01',
      text: 'So. A transformer is one function. Integers in — a probability for every possible next token out. That is all. In the next few minutes we will open it up and follow the shapes through, until nothing is left you could not write yourself.' },

    { id: 'a02', scene: 'tf-tokens', step: 0,
      text: 'But a network cannot read a string. It only takes numbers. So something has to stand in between — the <b>tokenizer</b>. And here is the thing about it. It is not trained. It is a fixed dictionary, built once, before training even starts.' },

    { id: 'a03', scene: 'tf-tokens', step: 1,
      text: 'So how did it learn where to cut? By counting. Find the most frequent pair of neighbours, merge them into one symbol, write the rule down, repeat. Do that fifty thousand times, and <b>low</b> is one token while <b>lower</b> takes three.' },

    { id: 'a04', scene: 'tf-tokens', step: 2,
      text: 'Now each piece gets one fixed <b>id</b>. And the alphabet underneath is not letters — it is the two hundred and fifty six byte values. So nothing is ever unknown. Not emoji, not Chinese, not broken text.' },

    { id: 'a05', scene: 'tf-tokens', step: 3,
      text: 'And that id? It is a <b>row number</b>. Nothing cleverer. The embedding table hands back that row: a vector of learned numbers describing this token. Integers went in. Floats come out.' },

    { id: 'a06', scene: 'tf-tokens', step: 4,
      text: 'Look at the size of that table, though. Vocabulary times model width. For Llama 3.2 1B that is two hundred and sixty three million numbers — about a fifth of the whole model, spent on a lookup.',
      say: 'Look at the size of that table, though. Vocabulary times model width. For Llama three point two, one B, that is two hundred and sixty three million numbers — about a fifth of the whole model, spent on a lookup.' },

    { id: 'a07', scene: 'tf-attend', step: 0,
      text: 'Right. Here is what attention fixes. After the embedding, the vector for <b>it</b> is the same in any sentence — no trace of the cat. So each token makes three vectors, through three learned matrices. A <b>query</b>: what I want. A <b>key</b>: what I offer. A <b>value</b>: what I hand over.' },

    { id: 'a08', scene: 'tf-attend', step: 0,
      text: 'One thing has to happen first, though. Attention has no idea what order the tokens are in — shuffle them and the same vectors come straight back. So we rotate each pair of numbers inside the query and the key, by an angle set by position. That is <b>RoPE</b>.',
      say: 'One thing has to happen first, though. Attention has no idea what order the tokens are in — shuffle them and the same vectors come straight back. So we rotate each pair of numbers inside the query and the key, by an angle set by position. That is rope. Rotary position embedding.' },

    { id: 'a09', scene: 'tf-attend', step: 1,
      text: 'Now the comparison. One dot product between this query and every key. Large when two vectors point the same way, near zero when they do not. And this is what the rotation bought us: only the gap between the two positions changes the score.' },

    { id: 'a10', scene: 'tf-attend', step: 2,
      text: 'Now watch every score shrink. We divide by the square root of the head dimension — the head is sixty four wide, so we divide by eight. Why bother? Because otherwise the scores spread so far that the softmax saturates, and a saturated softmax passes almost no gradient.' },

    { id: 'a11', scene: 'tf-attend', step: 3,
      text: '<b>Softmax</b> turns that row into weights. All positive. All adding to exactly one. The same function you met in Lesson One — only now it is working in the middle of the network, on every row of every head.' },

    { id: 'a12', scene: 'tf-attend', step: 4,
      text: 'Now the mixing. And notice what gets mixed — not the keys, the <b>values</b>. Each value is scaled by its own weight. Here, the word it pulls in sixty two per cent of the value of cat.' },

    { id: 'a13', scene: 'tf-attend', step: 5,
      text: 'Then you add them up. That sum is the output at this position. And that is attention. A weighted average. Everything else in this lesson is packaging around that one line.' },

    { id: 'a14', scene: 'tf-mask', step: 0,
      text: 'One query gave us one row. Every query gives the whole grid. Eight tokens, an eight by eight matrix. And this is the expensive part of the model, because it grows with the <b>square</b> of the sequence length.' },

    { id: 'a14b', scene: 'tf-mask', step: 1,
      text: 'Look at row 5. That is token 5, asking about the sequence. Columns 6 and 7 are its future. If it could read them, it would be reading the answer.',
      say: 'Look at row five. That is token five, asking about the sequence. Columns six and seven are its future. If it could read them, it would be reading the answer.' },

    { id: 'a15', scene: 'tf-mask', step: 2,
      text: 'So here is the rule that makes this a language model. <b>Before</b> the softmax, every cell above the diagonal becomes negative infinity. That is the whole causal mask.' },

    { id: 'a16', scene: 'tf-mask', step: 3,
      text: 'The exponential of negative infinity is zero, so those weights vanish. The row on the right still adds to one, over only the part it may see. And do it in that order. Mask first. Softmax second. Always.' },

    { id: 'a17', scene: 'tf-mask', step: 4,
      text: 'And here is the payoff. The first row predicts from one token. The last predicts from eight. One forward pass gives one training signal per position, at no extra cost. That is why next token prediction scales.' },

    { id: 'a18', scene: 'tf-heads', step: 0,
      text: 'One softmax row is one weighted average. So one head expresses exactly one relation per position, and no more. For real language? Nowhere near enough.' },

    { id: 'a19', scene: 'tf-heads', step: 1,
      text: 'So we split it. And this is the bit people get wrong — a head is <b>not</b> a copy of the layer. Three hundred and eighty four numbers, cut into six slices of sixty four. Same total width. Six heads cost the arithmetic of one.' },

    { id: 'a20', scene: 'tf-heads', step: 2,
      text: 'Each slice gets its own query, key and value matrices, and runs its own attention over the very same tokens. Six independent score matrices, side by side.' },

    { id: 'a21', scene: 'tf-heads', step: 3,
      text: 'And look what turns up. One head tracks the previous token. One stares back at the very first. One completes a pattern it has seen — show it A then B, and when A returns, it pushes B. Nobody programmed that.' },

    { id: 'a22', scene: 'tf-heads', step: 4,
      text: 'Then the six outputs are laid end to end, back to the full width — and one more learned matrix mixes the slices before the result rejoins the stream.' },

    { id: 'a23', scene: 'tf-gqa', step: 0,
      text: 'Right. Now the part that decides whether your model fits on a phone. Training runs one pass over the sentence. Generation does not. You make a token, append it, run again. So the model keeps a key and a value for every token seen, in every layer. That is the <b>KV cache</b>.',
      say: 'Right. Now the part that decides whether your model fits on a phone. Training runs one pass over the sentence. Generation does not. You make a token, append it, run again. So the model keeps a key and a value for every token seen, in every layer. That is the K V cache.' },

    { id: 'a24', scene: 'tf-gqa', step: 1,
      text: 'With plain multi-head attention, every query head keeps its own key and value head. Thirty two of each. Watch the number on the right. At eight thousand tokens, 1 GiB of cache — on top of the weights.',
      say: 'With plain multi head attention, every query head keeps its own key and value head. Thirty two of each. Watch the number on the right. At eight thousand tokens, one gibibyte of cache — on top of the weights.' },

    { id: 'a25', scene: 'tf-gqa', step: 2,
      text: 'So group them. Four query heads share <b>one</b> key and value head. Queries stay at thirty two; stored heads drop to eight. Two, times sixteen layers, times eight heads, times sixty four, times two bytes. 32 KiB a token. 256 MiB at eight thousand.',
      say: 'So group them. Four query heads share one key and value head. Queries stay at thirty two; stored heads drop to eight. Two, times sixteen layers, times eight heads, times sixty four, times two bytes. Thirty two kibibytes a token. Two hundred and fifty six mebibytes at eight thousand.' },

    { id: 'a25b', scene: 'tf-gqa', step: 3,
      text: 'A quarter of the memory, and quality stays close to full multi-head. That is why grouped-query attention is in almost every model shipped this year.',
      say: 'A quarter of the memory, and quality stays close to full multi head. That is why grouped query attention is in almost every model shipped this year.' },

    { id: 'a26', scene: 'tf-gqa', step: 4,
      text: 'Push further, to one shared key and value head, and you get multi-query attention. 32 MiB — thirty two times smaller than multi-head. But the quality drop is audible.',
      say: 'Push further, to one shared key and value head, and you get multi query attention. Thirty two mebibytes — thirty two times smaller than multi head. But the quality drop is audible.' },

    { id: 'a27', scene: 'tf-gqa', step: 5,
      text: 'So remember which number moved. The <b>query</b> head count never entered that formula at all. And on a phone it is usually the cache, not the weights, that runs out of memory first.' },

    { id: 'a28', scene: 'tf-block', step: 0,
      text: 'One piece left. The block that repeats. It starts and ends on the same wire — same shape in, same shape out. That wire has a name. The <b>residual stream</b>. And no matrix ever sits on it.' },

    { id: 'a29', scene: 'tf-block', step: 1,
      text: 'Attention never consumes the stream. It reads a <b>normalised copy</b>. RMSNorm divides the vector by the root mean square of its own entries, then scales it. No mean, no bias. Half the parameters of LayerNorm.',
      say: 'Attention never consumes the stream. It reads a normalised copy. R M S norm divides the vector by the root mean square of its own entries, then scales it. No mean, no bias. Half the parameters of layer norm.' },

    { id: 'a30', scene: 'tf-block', step: 2,
      text: 'And its output is <b>added back</b>. Added. The stream is edited, never replaced — which is why something written near the embedding is still readable thirty six layers later.' },

    { id: 'a31', scene: 'tf-block', step: 3,
      text: 'The lower branch repeats the pattern. Normalise, transform, add. That is the MLP, and modern models gate it — SwiGLU: two matrices up, one of them a gate, one back down. Most of the parameters live right here.',
      say: 'The lower branch repeats the pattern. Normalise, transform, add. That is the M L P, and modern models gate it — swiglu: two matrices up, one of them a gate, one back down. Most of the parameters live right here.' },

    { id: 'a32', scene: 'tf-block', step: 4,
      text: 'Now notice <b>where</b> the norms sit. Inside each branch. Not on the stream. That is pre-norm. Put them on the stream instead and the model needs a slow warmup just to start, and turns unstable as it gets deeper.',
      say: 'Now notice where the norms sit. Inside each branch. Not on the stream. That is pre norm. Put them on the stream instead, and the model needs a slow warmup just to start, and turns unstable as it gets deeper.' },

    { id: 'a33', scene: 'tf-block', step: 5,
      text: 'And now run it backwards. The gradient travels the whole stream with nothing multiplying it. In Lesson Two you watched gradients shrink through a chain of matrices. This unbroken path is the only reason thirty six layers train at all.' },

    { id: 'a34',
      text: 'And that is the whole architecture. Now go and build it. Write attention yourself, check it against PyTorch, stack six blocks into a ten point six five million parameter model, and train it on Shakespeare — so you have something to break. Lesson Four trains it properly, adds the cache you can already size, and picks how your model sounds.' }
  ]
};
