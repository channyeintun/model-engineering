/* =========================================================================
   Lesson 09 — narration script for the walkthrough.

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

   Spoken register, not written prose: contractions, discourse markers,
   fragments for emphasis, and a deliberately uneven rhythm. Punctuation
   is the pacing — the speech engine pauses at every full stop.
   ========================================================================= */

window.NARRATION = window.NARRATION || {};

window.NARRATION['09'] = {
  title: 'Export: leaving PyTorch',
  voice: 'alba',

  segments: [
    { id: 'a01',
      text: 'So. You have trained a model — and right now it is a Python object. One operator runs, then Python decides what happens next. That mode has a name: <b>eager</b>. This lesson is about the file you hand over at the border. How it is made, which four borders exist, and how to prove the model still works on the other side.',
      say: 'So. You\'ve trained a model — and right now it\'s a Python object. One operator runs, then Python decides what happens next. That mode has a name. Eager. This lesson is about the file you hand over at the border. How it\'s made, which four borders exist, and how to prove the model still works on the other side.' },

    { id: 'a02', scene: 'ex-capture', step: 0,
      text: 'On the left, ordinary Python. Look at two lines in particular. There is a branch that depends on the data. And a loop whose length arrives as an argument. Hold on to both of those.',
      say: 'On the left, ordinary Python. Look at two lines in particular. There\'s a branch that depends on the data. And a loop whose length arrives as an argument. Hold on to both of those.' },

    { id: 'a03', scene: 'ex-capture', step: 1,
      text: 'Now — here is what <b>torch.export</b> actually does. It runs your code once. Once. With the example input you gave it, writing down every tensor operation it sees. It does not write down the Python around them.',
      say: 'Now — here\'s what torch export actually does. It runs your code once. Once. With the example input you gave it, writing down every tensor operation it sees. It doesn\'t write down the Python around them.' },

    { id: 'a04', scene: 'ex-capture', step: 2,
      text: 'Watch the red lines. That branch? Decided once, by that single example. The path not taken simply is not in the graph — and nothing will ever remind you it is missing.',
      say: 'Watch the red lines. That branch? Decided once, by that single example. The path not taken simply isn\'t in the graph — and nothing will ever remind you it\'s missing.' },

    { id: 'a05', scene: 'ex-capture', step: 3,
      text: 'And the loop gets unrolled. It ran three times at capture, so the graph holds three blocks. For ever. Call it later asking for five, and nothing changes.' },

    { id: 'a06', scene: 'ex-capture', step: 5,
      text: 'So what comes out? Four things. A flat graph of <b>ATen operators</b> — PyTorch\'s small, fixed vocabulary. The weights, kept separately. A signature saying who owns each input. And a note of which dimensions may vary. That bundle is the <b>ExportedProgram</b>.',
      say: 'So what comes out? Four things. A flat graph of ay-ten operators — PyTorch\'s small, fixed vocabulary. The weights, kept separately. A signature saying who owns each input. And a note of which dimensions may vary. That bundle is the exported program.' },

    { id: 'a07', scene: 'ex-fanout', step: 0,
      text: 'Right. Capture happens once. Everything you do <b>after</b> capture decides the file — and the file decides which runtime can read it. Four destinations. They are not equal.',
      say: 'Right. Capture happens once. Everything you do after capture decides the file — and the file decides which runtime can read it. Four destinations. They\'re not equal.' },

    { id: 'a08', scene: 'ex-fanout', step: 1,
      text: '<b>ExecuTorch</b> keeps you inside PyTorch. Partitioners hand pieces of the graph to backends, and out comes a <code>.pte</code> file — a flatbuffer the runtime reads straight off disk, with no parsing step first.',
      say: 'Execu Torch keeps you inside PyTorch. Partitioners hand pieces of the graph to backends, and out comes a dot P T E file — a flatbuffer the runtime reads straight off disk, with no parsing step first.' },

    { id: 'a09', scene: 'ex-fanout', step: 2,
      text: '<b>ONNX</b> is defined by a committee, not by one framework. Your graph gets rewritten into a numbered operator vocabulary — an opset. One file, and a runtime that exists almost everywhere. Including inside a web page.',
      say: 'O N N X is defined by a committee, not by one framework. Your graph gets rewritten into a numbered operator vocabulary — an opset. One file, and a runtime that exists almost everywhere. Including inside a web page.' },

    { id: 'a10', scene: 'ex-fanout', step: 3,
      text: '<b>Core ML</b> is the Apple path, and the only supported way to reach the Neural Engine. But notice the cost. That package is compiled on the device the first time it loads. That compilation is your cold start.',
      say: 'Core M L is the Apple path, and the only supported way to reach the Neural Engine. But notice the cost. That package is compiled on the device the first time it loads. That compilation is your cold start.' },

    { id: 'a11', scene: 'ex-fanout', step: 4,
      text: 'Now look at the grey path underneath. <b>GGUF</b> is not on this road at all. Its own converter reads your checkpoint directly. No capture, no opset, no lowering. The catch? llama.cpp has to already know your architecture in C++.',
      say: 'Now look at the grey path underneath. Gee gee you eff isn\'t on this road at all. Its own converter reads your checkpoint directly. No capture, no opset, no lowering. The catch? Llama see plus plus has to already know your architecture, in C plus plus.' },

    { id: 'a12', scene: 'ex-dynamic', step: 0,
      text: 'So. Drop the <b>dynamic_shapes</b> argument for a moment, and capture again. It runs once, with an example one hundred and twenty-eight tokens long. Every shape it saw became a <b>constant</b> in the graph.',
      say: 'So. Drop the dynamic shapes argument for a moment, and capture again. It runs once, with an example one hundred and twenty eight tokens long. Every shape it saw became a constant in the graph.' },

    { id: 'a13', scene: 'ex-dynamic', step: 1,
      text: 'Feed it that same length again, and it runs. Green. Fine. And this is the test that gives you false confidence — because it is the only length anybody ever tried.',
      say: 'Feed it that same length again, and it runs. Green. Fine. And this is the test that gives you false confidence — because it\'s the only length anybody ever tried.' },

    { id: 'a14', scene: 'ex-dynamic', step: 2,
      text: 'Now watch the bar grow to two hundred. Refused. And nothing is wrong with your model. You told the graph this dimension was one hundred and twenty-eight, and it believed you.',
      say: 'Now watch the bar grow to two hundred. Refused. And nothing is wrong with your model. You told the graph this dimension was one hundred and twenty eight, and it believed you.' },

    { id: 'a15', scene: 'ex-dynamic', step: 3,
      text: 'So mark that dimension dynamic. Export writes down a <b>symbol and a range</b> where the constant used to sit. Now two hundred runs. And seven. And a thousand.',
      say: 'So mark that dimension dynamic. Export writes down a symbol and a range where the constant used to sit. Now two hundred runs. And seven. And a thousand.' },

    { id: 'a16', scene: 'ex-dynamic', step: 4,
      text: 'But do not mark everything dynamic — that is not the safe option. Every symbol is one more thing the compiler is no longer allowed to assume. It cannot fold constants, and on some backends it cannot plan memory at all.',
      say: 'But don\'t mark everything dynamic — that isn\'t the safe option. Every symbol is one more thing the compiler is no longer allowed to assume. It can\'t fold constants, and on some backends it can\'t plan memory at all.' },

    { id: 'a17', scene: 'ex-partition', step: 0,
      text: 'Right. After capture, your graph is a flat chain of operators. Nine of them here. And nothing on this screen knows anything about hardware yet.' },

    { id: 'a18', scene: 'ex-partition', step: 1,
      text: 'So the partitioner walks that chain and asks the backend one question per node. Can you run this one? Watch the rings turn green as the answers come back.' },

    { id: 'a19', scene: 'ex-partition', step: 2,
      text: 'The accepted nodes get grouped into <b>islands</b>. An island is a run of neighbours one backend agreed to take — and the whole run is replaced by a single opaque call into that backend.',
      say: 'The accepted nodes get grouped into islands. An island is a run of neighbours one backend agreed to take — and the whole run is replaced by a single opaque call into that backend.' },

    { id: 'a20', scene: 'ex-partition', step: 3,
      text: 'Two operators were refused. They just stay as portable CPU kernels, and the export succeeds anyway. That is partial delegation. It is also why an export never tells you it went badly.',
      say: 'Two operators were refused. They just stay as portable C P U kernels, and the export succeeds anyway. That\'s partial delegation. It\'s also why an export never tells you it went badly.' },

    { id: 'a21', scene: 'ex-partition', step: 4,
      text: 'But here is the price. Every island border is a real copy — accelerator memory to CPU memory, and back again. Count the red diamonds. Four of them. On every call, on every token.',
      say: 'But here\'s the price. Every island border is a real copy — accelerator memory to C P U memory, and back again. Count the red diamonds. Four of them. On every call, on every token.' },

    { id: 'a22', scene: 'ex-partition', step: 5,
      text: 'So when someone tells you it runs on the <b>NPU</b>, that is a claim to check, not a claim to accept. And checking is one function call. Four numbers: nine nodes total, seven delegated, two left on the CPU, two islands. High fraction, few islands. That is what good looks like.',
      say: 'So when someone tells you it runs on the N P U, that\'s a claim to check, not a claim to accept. And checking is one function call. Four numbers. Nine nodes total, seven delegated, two left on the C P U, two islands. High fraction, few islands. That\'s what good looks like.' },

    { id: 'a23', scene: 'ex-kv', step: 0,
      text: 'Now the hardest part of exporting a language model. A decode step is <b>not</b> a pure function. It reads the keys and values of every earlier token, and then it adds one more.',
      say: 'Now the hardest part of exporting a language model. A decode step is not a pure function. It reads the keys and values of every earlier token, and then it adds one more.' },

    { id: 'a24', scene: 'ex-kv', step: 1,
      text: 'But a graph has no memory. So the straightforward fix keeps the graph pure. Pass the cache in as a tensor, take the new one back out, hand it in again next call. Every runtime supports this.' },

    { id: 'a25', scene: 'ex-kv', step: 2,
      text: 'It is correct. And it is slow. Watch that red bar. The <b>whole</b> cache moves on every token, and it grows with the context — eleven point seven mebibytes per token, at a thousand positions, on your Lesson Four model.',
      say: 'It\'s correct. And it\'s slow. Watch that red bar. The whole cache moves on every token, and it grows with the context — eleven point seven mebibytes per token, at a thousand positions, on your Lesson Four model.' },

    { id: 'a26', scene: 'ex-kv', step: 3,
      text: 'The alternative gives the model a buffer it owns. Core ML calls it a state type; ExecuTorch calls it a mutable buffer. You write one slice per step. Twelve kibibytes. At any position. Look at the green bar.',
      say: 'The alternative gives the model a buffer it owns. Core M L calls it a state type. Execu Torch calls it a mutable buffer. You write one slice per step. Twelve kibibytes. At any position. Look at the green bar.' },

    { id: 'a27', scene: 'ex-kv', step: 4,
      text: 'Either way, the position dimension is dynamic and it has a maximum. That maximum is your context limit, chosen at export time. Lesson Four trained this model at two hundred and fifty-six positions, where the cache is a tenth of the weights. At four thousand and ninety-six it is forty-eight mebibytes — larger than the weights.',
      say: 'Either way, the position dimension is dynamic and it has a maximum. That maximum is your context limit, chosen at export time. Lesson Four trained this model at two hundred and fifty six positions, where the cache is a tenth of the weights. At four thousand and ninety six it is forty eight mebibytes — larger than the weights.' },

    { id: 'a28', scene: 'ex-verify', step: 0,
      text: 'Right. Last piece — and the one everybody skips. Push the <b>same</b> input through both paths. Not a fresh random input for each. The same one.',
      say: 'Right. Last piece — and the one everybody skips. Push the same input through both paths. Not a fresh random input for each. The same one.' },

    { id: 'a29', scene: 'ex-verify', step: 1,
      text: 'Then compare the outputs element by element. At four decimal places these two rows look identical — which is exactly why you measure, instead of looking.' },

    { id: 'a30', scene: 'ex-verify', step: 2,
      text: 'Different kernels add their numbers in a different order, so two correct implementations land about a millionth apart. That dashed red line is your tolerance. And you have to be able to defend where you drew it.',
      say: 'Different kernels add their numbers in a different order, so two correct implementations land about a millionth apart. That dashed red line is your tolerance. And you have to be able to defend where you drew it.' },

    { id: 'a31', scene: 'ex-verify', step: 3,
      text: 'One line of PyTorch turns that into a test. On a logit of twelve, with both tolerances at ten to the minus five, your budget is nought point zero zero zero one three — a shade above that dashed line. Put that line in CI — not in your terminal history.',
      say: 'One line of PyTorch turns that into a test. On a logit of twelve, with both tolerances at ten to the minus five, your budget is nought point zero zero zero one three — a shade above that dashed line. Put that line in C I. Not in your terminal history.' },

    { id: 'a32', scene: 'ex-verify', step: 4,
      text: 'Now export the <b>quantized</b> model instead. Every bar jumps three orders of magnitude and sails straight over the line. Four thousandths, against a tolerance of one ten-thousandth. It looks like a disaster.',
      say: 'Now export the quantized model instead. Every bar jumps three orders of magnitude and sails straight over the line. Four thousandths, against a tolerance of one ten thousandth. It looks like a disaster.' },

    { id: 'a33', scene: 'ex-verify', step: 5,
      text: 'But nothing broke. You compared against the wrong reference. Quantize in PyTorch first, then compare the export against <b>that</b>. Or better — stop comparing raw numbers, and compare the task metric you already have.',
      say: 'But nothing broke. You compared against the wrong reference. Quantize in PyTorch first, then compare the export against that. Or better — stop comparing raw numbers, and compare the task metric you already have.' },

    { id: 'a34',
      text: 'So. In the project you take one model through all four paths, and you write down where each one stops. You probably will not get four working files — and that is the point. Then Lesson Ten runs these files for real. On a phone, in a browser tab, with no server at all.',
      say: 'So. In the project you take one model through all four paths, and you write down where each one stops. You probably won\'t get four working files — and that\'s the point. Then Lesson Ten runs these files for real. On a phone, in a browser tab, with no server at all.' }
  ]
};
