/* =========================================================================
   Lesson 10 — narration script for the walkthrough.

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

   Write for the ear, the way a person teaches: contractions, discourse
   markers, fragments for emphasis, a long sentence then a very short one.
   No symbols the voice cannot say.
   ========================================================================= */

window.NARRATION = window.NARRATION || {};

window.NARRATION['10'] = {
  title: 'On the device',
  voice: 'alba',

  segments: [
    { id: 'a01',
      text: 'So. A model file is not a product. Somebody has to open it, put it in memory, pick a chip — while a person watches a spinner. And people want that on the device for one reason. Privacy.',
      say: 'So. A model file is not a product. Somebody has to open it, put it in memory, pick a chip. While a person watches a spinner. And people want that on the device for one reason. Privacy.' },

    { id: 'a02', scene: 'dev-bundle', step: 1,
      text: 'Right. What actually ships inside a phone app? Three things. Your code and interface — small. Then the runtime library, the <b>C++</b> engine that opens the model file and runs the graph. Build that minimal and it stays small too.',
      say: 'Right. What actually ships inside a phone app? Three things. Your code and interface. Small. Then the runtime library. The C plus plus engine that opens the model file and runs the graph. Build that minimal, and it stays small.' },

    { id: 'a03', scene: 'dev-bundle', step: 2,
      text: 'And the third thing. The model. 360 million parameters is 1.44 GB in FP32, and about 200 MB at 4 bits with group scales. Look at that block. It dwarfs everything else, many times over.',
      say: 'And the third thing. The model. Three hundred and sixty million parameters is one point four four gigabytes in thirty two bit floats, and two hundred megabytes at four bits. Look at that block. It dwarfs everything else, many times over.' },

    { id: 'a04', scene: 'dev-bundle', step: 3,
      text: 'But here is the problem. Apple will not send a download above 200 MB over a cellular connection, and Google Play caps an Android App Bundle\'s base module at roughly the same. You are over the line before you have written a feature.',
      say: 'But here\'s the problem. Apple won\'t send a download above two hundred megabytes over a cellular connection, and Google Play caps an Android app bundle\'s base module at roughly the same. You\'re over the line before you\'ve written a feature.' },

    { id: 'a05', scene: 'dev-bundle', step: 4,
      text: 'So the answer, on both platforms. Do not put the weights in the binary. Ship a small app. On first run, download the model, verify a hash so nothing substituted reaches your runtime, and cache it. Watch that bar collapse.',
      say: 'So the answer, on both platforms. Don\'t put the weights in the binary. Ship a small app. On first run, download the model, verify a hash so nothing substituted reaches your runtime, and cache it. Watch the bar collapse.' },

    { id: 'a06', scene: 'dev-bundle', step: 5,
      text: 'But that directory is not storage you own. iOS empties it under pressure — silently, while your app is not even running. So "the model is gone" is not an error. It is a normal state, and it needs a normal way back.',
      say: 'But that directory is not storage you own. i O S empties it under pressure. Silently, while your app isn\'t running. So, the model is gone, is not an error. It\'s a normal state, and it needs a normal way back.' },

    { id: 'a07', scene: 'dev-units', step: 0,
      text: 'Next question — and this one decides your battery. Which chip runs which layer? A phone has three. The CPU, general. The GPU, wide. And the Neural Engine, an <b>NPU</b>: fixed-function, and far cheaper per operation.',
      say: 'Next question. And this one decides your battery. Which chip runs which layer? A phone has three. The C P U, general. The G P U, wide. And the Neural Engine. An N P U. Fixed function, far cheaper per operation.' },

    { id: 'a08', scene: 'dev-units', step: 2,
      text: 'You do not choose per operator. You hand the runtime a priority list, and it asks each backend one question: can you take this node? A run of accepted nodes becomes a <b>delegate</b>. Watch most of the graph rise to the Neural Engine.',
      say: 'You don\'t choose per operator. You hand the runtime a priority list, and it asks each backend one question. Can you take this node? Accepted nodes become a delegate. Now watch most of the graph rise to the Neural Engine.' },

    { id: 'a09', scene: 'dev-units', step: 3,
      text: 'But it has conditions. It is built around FP16, and it wants four-dimensional tensors, (B, C, 1, S). This operator demands FP32. Refused. It drops to the CPU — and your graph has just split in two.',
      say: 'But it has conditions. It\'s built around sixteen bit floats, and it wants four dimensional tensors. Batch, channels, one, sequence. This operator demands thirty two bit. Refused. It drops to the C P U. And your graph has just split in two.' },

    { id: 'a10', scene: 'dev-units', step: 5,
      text: 'Count the red lines. Every lane change is a tensor copy. So a model that "runs on the Neural Engine" is really three to ten islands with CPU glue between them. Verify that — dump the partition report. And the prize is energy per token, not time.',
      say: 'Count the red lines. Every lane change is a tensor copy. So a model that runs on the Neural Engine is really three to ten islands with C P U glue. Verify that. Dump the partition report. And the prize is energy per token.' },

    { id: 'a11', scene: 'dev-cold', step: 1,
      text: 'Now start-up. "Three seconds to the first answer" is not something you can fix, because it is three separate costs. One: open the file and map it into memory. 12 ms. Nothing is copied — pages arrive the first time a weight is touched.',
      say: 'Now start up. Three seconds to the first answer is not something you can fix, because it\'s three separate costs. One. Open the file, map it into memory. Twelve milliseconds. Nothing is copied. Pages arrive the first time a weight is touched.' },

    { id: 'a12', scene: 'dev-cold', step: 2,
      text: 'Two: compile the model for this exact device. On Apple a <b>.mlpackage</b> becomes an <b>.mlmodelc</b>; in a browser the backend compiles shaders. Keep watching that red block. 2 400 ms. This is the one that dominates.',
      say: 'Two. Compile the model for this exact device. On Apple, a model package becomes a compiled model directory. In a browser, the backend compiles shaders. Keep watching that red block. Two thousand four hundred milliseconds. This is the one that dominates.' },

    { id: 'a13', scene: 'dev-cold', step: 3,
      text: 'Three: prefill. Run the prompt through once to fill the KV cache. 380 ms. And notice — prefill is compute-bound, so an accelerator helps here. Decoding one token at a time is memory-bound, and gains nothing.',
      say: 'Three. Prefill. Run the prompt through once, filling the key value cache. Three hundred and eighty milliseconds. And notice. Prefill is compute bound, so an accelerator helps here. Decoding one token at a time is memory bound, and gains nothing.' },

    { id: 'a14', scene: 'dev-cold', step: 4,
      text: 'So compile once, and write the artifact to disk. 2 792 ms becomes 432. Two details decide it. Move the result out of the temporary directory. And store it in Application Support — not caches. Caches is what iOS reclaims.',
      say: 'Compile once, and write that artifact to disk. Two thousand seven hundred and ninety two milliseconds becomes four hundred and thirty two. Two details decide it. Move the result out of the temporary directory. And store it in Application Support. Not caches. Caches is what i O S reclaims.' },

    { id: 'a15', scene: 'dev-cold', step: 5,
      text: 'And measure this properly. Time it twice in a row and you have measured a warm cache — a number no first-time user ever sees. Reboot the device. Then report both numbers, and label which is which.' },

    { id: 'a16', scene: 'dev-cache', step: 0,
      text: 'Now the second target. A browser tab has no bundle — nothing to install, nothing to review. A URL is the whole distribution. The price? The weights arrive over the network the first time somebody opens your page.',
      say: 'Now the second target. A browser tab has no bundle. Nothing to install, nothing to review. A web address is the whole distribution. The price? The weights arrive over the network the first time somebody opens your page.' },

    { id: 'a17', scene: 'dev-cache', step: 1,
      text: 'Watch that meter crawl. 200 MB is about 160 seconds on a 10 Mbit/s mobile connection, 32 seconds on 50 Mbit/s Wi-Fi. So build a real download screen. Show the bytes, show the progress, let the user start it.',
      say: 'Watch that meter crawl. Two hundred megabytes is about one hundred and sixty seconds on a ten megabit connection. Thirty two seconds on fifty megabit wifi. So build a real download screen. Show the bytes and the progress, and let the user start it.' },

    { id: 'a18', scene: 'dev-cache', step: 2,
      text: 'The files land in <b>Cache Storage</b>, keyed by URL. And here is the bit people miss — that happens once per origin, not once per visit. This is the single most important thing to get right in a browser deployment.',
      say: 'The files land in Cache Storage, keyed by web address. And here\'s the bit people miss. Once per origin. Not once per visit. This is the most important thing to get right in a browser deployment.' },

    { id: 'a19', scene: 'dev-cache', step: 3,
      text: 'Second visit. The same URLs resolve from disk, and zero bytes travel over the network. Which is also why your own testing lies to you. After that first run, your machine sits permanently in the good case.',
      say: 'Second visit. Same addresses, resolved from disk. Zero bytes over the network. Which is also why your own testing lies to you. After that first run, your machine sits permanently in the good case.' },

    { id: 'a20', scene: 'dev-cache', step: 5,
      text: 'Two catches. Browsers evict Cache Storage under pressure, exactly as iOS empties a caches directory — a cache miss is normal. And note what is not promised. Your code caches the weights. Whether the shaders stay compiled is the browser\'s business.',
      say: 'Two catches. Browsers evict cache storage under pressure, exactly as i O S empties a caches directory. A cache miss is normal. And note what is not promised. Your code caches the weights. Whether the shaders stay compiled is the browser\'s business.' },

    { id: 'a21', scene: 'dev-gpu', step: 1,
      text: 'In the page there are two ways to multiply matrices, and they are not close. Both grids compute the same tile. <b>WebAssembly</b> does it on the CPU with SIMD — eight numbers per instruction. Four threads, four rows at a time.',
      say: 'In the page there are two ways to multiply matrices, and they are not close. Both grids compute the same tile. Web Assembly does it on the C P U, using single instruction, multiple data. Eight numbers per instruction. Four threads, four rows at a time.' },

    { id: 'a22', scene: 'dev-gpu', step: 2,
      text: 'But those threads need <b>SharedArrayBuffer</b>, which needs a cross-origin-isolated page, which needs two response headers: COOP and COEP. Your dev server sets them. Your CDN does not. Nothing errors — you quietly drop to one thread.',
      say: 'But those threads need shared array buffer, which needs a cross origin isolated page, which needs two response headers. Cross origin opener policy, and cross origin embedder policy. Your dev server sets them. Your host does not. Nothing errors. You drop to one thread.' },

    { id: 'a23', scene: 'dev-gpu', step: 3,
      text: '<b>WebGPU</b> hands the same work to the GPU as one dispatch of thousands of parallel invocations. Watch the whole grid fill at once. This — not clever kernels — is what made transformer inference in a browser practical at all.',
      say: 'Web G P U hands the same work to the graphics chip as one dispatch of thousands of parallel invocations. Watch the whole grid fill at once. This, not clever kernels, is what made transformer inference in a browser practical.' },

    { id: 'a24', scene: 'dev-gpu', step: 4,
      text: 'And as of January 2026 it is <b>Baseline</b> — the label for a feature that works in the current version of every major browser. Chrome, Edge, Firefox 141, Safari 26. So plan for WebGPU. WebAssembly is the fallback, not the plan.',
      say: 'And as of January twenty twenty six, it\'s Baseline. The label for a feature that works in the current version of every major browser. Chrome, Edge, Firefox one four one, Safari twenty six. Plan for Web G P U. Web Assembly is the fallback.' },

    { id: 'a25', scene: 'dev-mem', step: 0,
      text: 'One limit left, and it is the harshest. Memory. Your app gets a budget, and an app that exceeds it is not slowed, not swapped. It is killed. iOS calls that <b>Jetsam</b>. On a 6 GB phone, hold 2 to 3 GB.',
      say: 'One limit left. The harshest. Memory. Your app gets a budget, and an app that goes over isn\'t slowed, isn\'t swapped. It is killed. i O S calls that Jetsam. On a six gigabyte phone, hold two to three gigabytes.' },

    { id: 'a26', scene: 'dev-mem', step: 2,
      text: 'And we change model on purpose — the largest that could plausibly fit. 3 billion parameters at 4 bits with group scales. The 1.83 GB file from Lesson 08. Those are <b>clean</b> pages, mapped from a file, so the system can drop them and read them back.',
      say: 'And we change model on purpose. The largest that could plausibly fit. Three billion parameters at four bits with group scales. One point eight three gigabytes. Clean pages, mapped from a file, so the system can drop them and read them back.' },

    { id: 'a27', scene: 'dev-mem', step: 3,
      text: 'The KV cache is the exact opposite. <b>Dirty</b> anonymous memory that exists nowhere else — so it cannot be dropped. Only kept, or lost with your process. And look at it grow. Every token you generate.',
      say: 'The key value cache is the exact opposite. Dirty anonymous memory that exists nowhere else. So it can\'t be dropped. Only kept, or lost with your process. And look at it grow. Every token you generate.' },

    { id: 'a28', scene: 'dev-mem', step: 4,
      text: 'Cross the budget and the phone does not slow you down, and it does not swap. It terminates your app. Mid-conversation. No warning — just a jetsam event in the crash logs afterwards.',
      say: 'Cross the budget, and the phone doesn\'t slow you down, and it doesn\'t swap. It terminates your app. Mid conversation. No warning. Just a jetsam event in the crash logs afterwards.' },

    { id: 'a29', scene: 'dev-mem', step: 5,
      text: 'So do the sum. 2.50 GB of budget, minus 1.83 for the weights, minus 0.25 for your app. That leaves 0.42 GB. At 131 kB per token, about 3 200 tokens — where the app dies. So ship 2 048.',
      say: 'Now the sum. Two point five gigabytes of budget. Minus one point eight three for the weights. Minus nought point two five for the app. Nought point four two left. At a hundred and thirty one kilobytes per token, three thousand two hundred tokens. Where the app dies. Ship two thousand and forty eight.' },

    { id: 'a30', scene: 'dev-os', step: 1,
      text: 'Now the question that should have come first. Does the operating system already ship a model good enough? Because look what you are about to ask for. 200 MB. From every new user. Before your app does anything at all.',
      say: 'Now the question that should have come first. Does the operating system already ship a model good enough? Because look what you\'re about to ask for. Two hundred megabytes. From every new user. Before your app does anything at all.' },

    { id: 'a31', scene: 'dev-os', step: 3,
      text: 'The system model costs zero bytes. On Apple that is <b>Foundation Models</b>: about 3 billion parameters, free and offline. On Android, ML Kit over AICore. One warning though. Apple\'s larger option runs in Private Cloud Compute — that request leaves the phone.',
      say: 'The system model costs zero bytes. On Apple that\'s Foundation Models. About three billion parameters, free and offline. On Android, M L Kit over A I Core. One warning though. Apple\'s larger option runs in Private Cloud Compute. That request leaves the phone.' },

    { id: 'a32', scene: 'dev-os', step: 4,
      text: 'So the system model is the default. You pay the 200 MB for one of four things. A specific fine-tune. A modality the platform skips. Old devices. Or identical behaviour on iOS, Android and the web.',
      say: 'So the system model is the default. You pay two hundred megabytes for one of four things. A specific fine tune. A modality the platform skips. Old devices. Or identical behaviour on i O S, Android and the web.' },

    { id: 'a33',
      text: 'And run the licence check first. Apache-2.0 and MIT are safe in a closed app. <b>Copyleft</b> is not. Piper is GPL-3.0 — a decision your legal team makes, not you. Kokoro is Apache-2.0, and it is 60 to 80 MB.',
      say: 'And run the licence check first. Apache two point zero and M I T are safe in a closed app. Copyleft is not. Piper is G P L three point zero. Legal\'s decision, not yours. Kokoro is Apache two point zero, sixty to eighty megabytes.' },

    { id: 'a34',
      text: 'Project 10 has no training in it — it is measurement, and honesty. Load a model into a browser tab, time the first visit and the second, then break it on purpose. And in Lesson 11 the input changes: sound becomes a picture, and that picture becomes letters.',
      say: 'Project ten has no training in it. It\'s measurement, and honesty. Load a model into a browser tab, time both visits, then break it on purpose. And in Lesson eleven the input changes. Sound becomes a picture, the picture becomes letters.' }
  ]
};
