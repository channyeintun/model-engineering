/* =========================================================================
   Lesson 08 — narration script for the walkthrough.

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

   Written to be spoken, not read: contractions, fragments, questions the
   voice answers, and a full stop wherever the lecturer would take a beat.
   ========================================================================= */

window.NARRATION = window.NARRATION || {};

window.NARRATION['08'] = {
  title: 'Latency and memory',
  voice: 'alba',

  segments: [
    { id: 'a01',
      text: 'So. Two questions run through this whole lesson. How fast will this model generate text — and is the number you just measured actually real? By the end, you can answer the first one on paper, before you write any code.' },

    { id: 'a02', scene: 'lm-prefill', step: 0,
      text: 'Here is what nobody tells you at the start. A model generating text is not one machine. It is two. Both begin with a prompt — eight tokens drawn here, but picture 512.',
      say: 'Here\'s what nobody tells you at the start. A model generating text isn\'t one machine. It\'s two. Both of them begin with a prompt. Eight tokens are drawn here, but picture five hundred and twelve.' },

    { id: 'a03', scene: 'lm-prefill', step: 1,
      text: 'Prefill is the first machine. All 512 tokens go through in one wide pass. Every weight read once, and used 512 times. That is roughly 1 700 operations per byte — far above the chip\'s balance point of 53. <b>Compute-bound</b>.',
      say: 'Prefill is the first machine. All five hundred and twelve tokens go through in one wide pass. Every weight read once, and used five hundred and twelve times. That\'s roughly seventeen hundred operations per byte. Far above the chip\'s balance point of fifty three. Compute bound.' },

    { id: 'a04', scene: 'lm-prefill', step: 3,
      text: 'Now decode. The second machine. One token goes in. And to get the next one, the model reads every weight again — the whole 1.83 GB — and uses each number exactly once. Once.',
      say: 'Now decode. The second machine. One token goes in. And to get the next one, the model reads every weight again. The whole one point eight three gigabytes. And uses each number exactly once. Once.' },

    { id: 'a05', scene: 'lm-prefill', step: 5,
      text: '3.3 against 1 700. Same file, same weights, two completely different bottlenecks. Decode is <b>memory-bound</b>: the chip is not computing, it is waiting. Benchmark them separately, or you have measured nothing.',
      say: 'Three point three, against seventeen hundred. Same file, same weights, two completely different bottlenecks. Decode is memory bound. The chip isn\'t computing. It\'s waiting. So benchmark them separately, or you\'ve measured nothing.' },

    { id: 'a06', scene: 'lm-wall', step: 0,
      text: 'Let us make that physical. To produce one token, the chip has to read every weight once. In BF16 this three-billion-parameter model is 6.0 GB. Six gigabytes. Per token.',
      say: 'Let\'s make that physical. To produce one token, the chip has to read every weight once. In B F sixteen, this three billion parameter model is six gigabytes. Six gigabytes. Per token.' },

    { id: 'a07', scene: 'lm-wall', step: 1,
      text: 'And between memory and compute there is exactly one pipe: <b>memory bandwidth</b>. On a recent phone, about 75.8 GB a second. So one token costs 79.2 ms. That is 12.6 tokens per second, and nothing goes faster than the pipe.',
      say: 'And between memory and compute there\'s exactly one pipe. Memory bandwidth. On a recent phone, about seventy five point eight gigabytes a second. So one token costs seventy nine point two milliseconds. Twelve point six tokens per second. And nothing goes faster than the pipe.' },

    { id: 'a08', scene: 'lm-wall', step: 2,
      text: 'So what is the arithmetic doing all this time? Almost nothing. At BF16 that is 1 FLOP per byte, on a chip balanced at 53. About 2 % busy. Ninety-eight per cent of your expensive chip, idle, waiting for bytes.',
      say: 'So what\'s the arithmetic doing all this time? Almost nothing. At B F sixteen that\'s one flop per byte, on a chip balanced at fifty three. About two per cent busy. Ninety eight per cent of your expensive chip, idle, waiting for bytes.' },

    { id: 'a09', scene: 'lm-wall', step: 3,
      text: 'So shrink the file. Quantize to <span class="kw">Q4_K_M</span> — 4.89 bits per weight — and 6.0 GB becomes 1.83 GB. Three times less water, through exactly the same pipe. And fewer bytes per weight lifts the intensity to 3.3, so the arithmetic reaches 6 %.',
      say: 'So shrink the file. Quantize to Q four K M, four point eight nine bits per weight, and six gigabytes becomes one point eight three gigabytes. Three times less water, through exactly the same pipe. And fewer bytes per weight lifts the intensity to three point three, so the arithmetic reaches six per cent.' },

    { id: 'a10', scene: 'lm-wall', step: 4,
      text: '24.2 ms per token instead of 79.2. The ceiling climbs from 13 to 41 tokens per second. And that is the whole formula — bandwidth divided by weight bytes. It is a ceiling though, not a promise: real throughput lands at 40 to 70 per cent of it.',
      say: 'Twenty four point two milliseconds per token, instead of seventy nine point two. The ceiling climbs from thirteen to forty one tokens per second. And that\'s the whole formula. Bandwidth, divided by weight bytes. It\'s a ceiling though, not a promise. Real throughput lands at forty to seventy per cent of it.' },

    { id: 'a11', scene: 'lm-kv', step: 0,
      text: 'Right. That was half the memory. At <span class="kw">Q4_K_M</span> the weights are 1 830 MB, and they never move — the same size whatever you ask, however long the conversation runs.',
      say: 'Right. That was half the memory. At Q four K M the weights are one thousand eight hundred and thirty megabytes, and they never move. The same size whatever you ask, however long the conversation runs.' },

    { id: 'a12', scene: 'lm-kv', step: 1,
      text: 'The other half does move. Every token you keep in context stores one key and one value, in every layer, for every key/value head. Multiply it out: 131 kB. Per token.',
      say: 'The other half does move. Every token you keep in context stores one key and one value, in every layer, for every K V head. Multiply it out. A hundred and thirty one kilobytes. Per token.' },

    { id: 'a13', scene: 'lm-kv', step: 2,
      text: 'At 512 tokens that is 67 MB. About four per cent of the weights. Nobody notices — and that is exactly why this bug never shows up on your laptop.',
      say: 'At five hundred and twelve tokens that\'s sixty seven megabytes. About four per cent of the weights. Nobody notices. Which is exactly why this bug never shows up on your laptop.' },

    { id: 'a14', scene: 'lm-kv', step: 3,
      text: 'At 2 048 tokens, 268 MB. At 8 192, it is 1 074 MB — nearly two thirds of the weights. And look at the shape of it. Straight line. It just keeps going.',
      say: 'At two thousand and forty eight tokens, two hundred and sixty eight megabytes. At eight thousand one hundred and ninety two, it\'s one thousand and seventy four megabytes. Nearly two thirds of the weights. And look at the shape of it. Straight line. It just keeps going.' },

    { id: 'a15', scene: 'lm-kv', step: 4,
      text: 'At 32 768 tokens the cache is 4 295 MB. More than twice the weights. This is the number that gets your app killed — and it arrives after the user has been talking for a long while. Never at launch.',
      say: 'At thirty two thousand seven hundred and sixty eight tokens, the cache is four thousand two hundred and ninety five megabytes. More than twice the weights. This is the number that gets your app killed. And it arrives after the user has been talking for a long while. Never at launch.' },

    { id: 'a16', scene: 'lm-kv', step: 5,
      text: 'Grouped-query attention is the only reason this is survivable at all. Without shared keys and values, every cyan bar would be four times taller. And one repair to the formula: attention re-reads the cache every step, so at 8 192 tokens the ceiling drops from 40 to 26.',
      say: 'Grouped query attention is the only reason this is survivable at all. Without shared keys and values, every cyan bar would be four times taller. And one repair to the formula. Attention re-reads the cache on every step. So at eight thousand one hundred and ninety two tokens, the ceiling drops from forty to twenty six.' },

    { id: 'a17',
      text: 'Now — on a server you fix memory-bound decode with batching. One weight read, shared by many users. On a device? One user. Batch size is 1, forever. The one honest exception is speculative decoding, where a small draft model guesses ahead and the big model checks four guesses in a single read.',
      say: 'Now. On a server, you fix memory bound decode with batching. One weight read, shared by many users. On a device? One user. Batch size is one, forever. The one honest exception is speculative decoding, where a small draft model guesses ahead, and the big model checks four guesses in a single read.' },

    { id: 'a18', scene: 'lm-fuse', step: 0,
      text: 'One decode step launches a few thousand tiny programs on the chip. Kernels. Here are three of them, in the order the model runs them: a normalisation, a scale, and an activation.' },

    { id: 'a19', scene: 'lm-fuse', step: 1,
      text: 'And here is the cost nobody counts. Each kernel reads its input from memory, does its work, and writes its output back. Three operations. Six trips. 36 kB of traffic.',
      say: 'And here\'s the cost nobody counts. Each kernel reads its input from memory, does its work, and writes its output back. Three operations. Six trips. Thirty six kilobytes of traffic.' },

    { id: 'a20', scene: 'lm-fuse', step: 3,
      text: '<b>Kernel fusion</b> writes one kernel that does the whole chain while the values are still in registers. The two middle tensors? Never written. Never read. Never born at all.' },

    { id: 'a21', scene: 'lm-fuse', step: 4,
      text: 'Two trips instead of six. 12 kB instead of 36. On a laptop GPU, compiling a decode loop usually takes 10 to 30 per cent off the latency. But it cannot shrink the weight read. Only fewer bits per weight does that.',
      say: 'Two trips instead of six. Twelve kilobytes instead of thirty six. On a laptop G P U, compiling a decode loop usually takes ten to thirty per cent off the latency. But it can\'t shrink the weight read. Only fewer bits per weight does that.' },

    { id: 'a22', scene: 'lm-timing', step: 0,
      text: 'Now the part where people lie to themselves without meaning to. Python does not run the model. It puts the work on the device queue and returns immediately — long before anything has actually been computed.',
      say: 'Now the part where people lie to themselves without meaning to. Python doesn\'t run the model. It puts the work on the device queue and returns immediately. Long before anything has actually been computed.' },

    { id: 'a23', scene: 'lm-timing', step: 1,
      text: 'So start a clock here, stop it when Python returns, and the stopwatch says 0.4 ms. Beautiful. Plausible. And completely wrong — you measured how fast Python can fill a queue.',
      say: 'So start a clock here, stop it when Python returns, and the stopwatch says zero point four milliseconds. Beautiful. Plausible. And completely wrong. You measured how fast Python can fill a queue.' },

    { id: 'a24', scene: 'lm-timing', step: 2,
      text: 'The device is still working. The real end of the step is here: 24.2 ms. The wrong number was smaller by a factor of sixty — and it looked entirely reasonable on the screen.',
      say: 'The device is still working. The real end of the step is here. Twenty four point two milliseconds. The wrong number was smaller by a factor of sixty. And it looked entirely reasonable on the screen.' },

    { id: 'a25', scene: 'lm-timing', step: 3,
      text: 'The fix is a synchronisation call. It blocks until the device queue is empty. One before you start the clock, one before you stop it. Two lines. That is the whole cure.',
      say: 'The fix is a synchronisation call. It blocks until the device queue is empty. One before you start the clock, and one before you stop it. Two lines. That\'s the whole cure.' },

    { id: 'a26', scene: 'lm-timing', step: 4,
      text: 'Then the other half of the recipe. The first run also allocates buffers and compiles kernels, so it is not the model you want to time. Warm up. Throw those runs away. And take the median — never the mean.',
      say: 'Then the other half of the recipe. The first run also allocates buffers and compiles kernels, so it isn\'t the model you want to time. Warm up. Throw those runs away. And take the median. Never the mean.' },

    { id: 'a27', scene: 'lm-waterfall', step: 1,
      text: 'On a phone, one request is not one number. Split a cold start into phases. Opening the file and mapping the weights into memory is nearly free — 12 ms.',
      say: 'On a phone, one request isn\'t one number. Split a cold start into phases. Opening the file, and mapping the weights into memory, is nearly free. Twelve milliseconds.' },

    { id: 'a28', scene: 'lm-waterfall', step: 2,
      text: 'Then the backend compiles the model for this particular device. 2 400 ms. And that is not inference at all — it is not your model being slow. On a cold start it is usually the biggest bar by far.',
      say: 'Then the backend compiles the model for this particular device. Two thousand four hundred milliseconds. And that\'s not inference at all. It isn\'t your model being slow. On a cold start it\'s usually the biggest bar by far.' },

    { id: 'a29', scene: 'lm-waterfall', step: 3,
      text: 'Prefill runs the prompt through — 380 ms — and only now can the first token appear. Add the three bars up. Time to first token: 2 792 ms. Nearly three seconds of nothing.',
      say: 'Prefill runs the prompt through. Three hundred and eighty milliseconds. And only now can the first token appear. So add the three bars up. Time to first token, two thousand seven hundred and ninety two milliseconds. Nearly three seconds of nothing.' },

    { id: 'a30', scene: 'lm-waterfall', step: 5,
      text: 'Now cache the compiled artifact. One row moves, and the second launch is a different application: 432 ms instead of 2 792. So the fix for a slow cold start is caching compilation. Not faster storage.',
      say: 'Now cache the compiled artifact. One row moves, and the second launch is a different application. Four hundred and thirty two milliseconds, instead of two thousand seven hundred and ninety two. So the fix for a slow cold start is caching compilation. Not faster storage.' },

    { id: 'a31', scene: 'lm-thermal', step: 0,
      text: 'One last trap, and it is the one that fools whole companies. The first ten seconds look excellent. 25 tokens per second — about 60 % of the 41 you predicted, which is a healthy result.',
      say: 'One last trap. And it\'s the one that fools whole companies. The first ten seconds look excellent. Twenty five tokens per second. About sixty per cent of the forty one you predicted, which is a healthy result.' },

    { id: 'a32', scene: 'lm-thermal', step: 1,
      text: 'But a phone has no fan. It heats up. The system lowers the clock speed to protect the battery and your hand. And after about 45 seconds, the rate steps down to 17.',
      say: 'But a phone has no fan. It heats up. The system lowers the clock speed, to protect the battery and your hand. And after about forty five seconds, the rate steps down to seventeen.' },

    { id: 'a33', scene: 'lm-thermal', step: 4,
      text: 'Then again, at two minutes. Down to 13. That flat dashed line is what a ten-second benchmark publishes. The honest figure is the average over a realistic run: about 18 tokens per second. Publish the curve, not the peak.',
      say: 'Then it happens again, at two minutes. Down to thirteen. That flat dashed line is what a ten second benchmark publishes. The honest figure is the average over a realistic run. About eighteen tokens per second. So publish the curve, not the peak.' },

    { id: 'a34',
      text: 'Two more limits, and neither shows on a laptop. iOS kills apps that go over a memory budget, and the cache is the half that cannot be evicted. App stores cap a cellular download near 200 MB, so weights ship separately. Then: predict the ceiling, measure honestly, report three numbers. Lesson 09 leaves Python for four export formats.',
      say: 'Two more limits, and neither shows on a laptop. iOS kills apps that go over a memory budget, and the cache is the half that can\'t be evicted. App stores cap a cellular download near two hundred megabytes, so weights ship separately. Then. Predict the ceiling, measure honestly, report three numbers. Lesson nine leaves Python, for four export formats.' }
  ]
};
