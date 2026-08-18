/* =========================================================================
   The course map. Every page reads this file, so the navigation, the
   progress bar and the next/previous links stay in sync automatically.
   ========================================================================= */

window.COURSE = {
  title: 'Model Engineering',
  tagline: 'Build small AI models that run on your own device.',

  parts: [
    { id: 'i',   n: 'Part I',   name: 'Foundations',
      blurb: 'How a network learns, written by hand.' },
    { id: 'ii',  n: 'Part II',  name: 'Language models',
      blurb: 'From attention to a model that writes.' },
    { id: 'iii', n: 'Part III', name: 'Make it small',
      blurb: 'Same skill, a fraction of the size.' },
    { id: 'iv',  n: 'Part IV',  name: 'Ship it',
      blurb: 'Leave Python. Land on a phone.' },
    { id: 'v',   n: 'Part V',   name: 'Speech',
      blurb: 'Ears, voice, and a real conversation.' }
  ],

  lessons: [
    {
      id: '01', part: 'i',
      title: 'Tensors and the training loop',
      short: 'Tensors & training',
      desc: 'What "learning" actually is: a number that measures wrongness, and a small step downhill.',
      minutes: 100,
      project: 'Classify handwritten digits',
      keywords: ['tensor', 'autograd', 'gradient descent', 'loss', 'optimizer']
    },
    {
      id: '02', part: 'i',
      title: 'Networks from scratch',
      short: 'Networks from scratch',
      desc: 'Backpropagation on real numbers you can follow by hand, then an MLP and a CNN you build yourself.',
      minutes: 105,
      project: 'An MLP and a CNN, no nn.Linear',
      keywords: ['backpropagation', 'chain rule', 'activation', 'MLP', 'CNN']
    },
    {
      id: '03', part: 'i',
      title: 'Inside a Transformer',
      short: 'Inside a Transformer',
      desc: 'Attention, one matrix at a time. Tokens, embeddings, heads, masks, and the block that repeats.',
      minutes: 105,
      project: 'Write attention from scratch',
      keywords: ['attention', 'tokenizer', 'embedding', 'RoPE', 'RMSNorm']
    },
    {
      id: '04', part: 'ii',
      title: 'Train your own tiny GPT',
      short: 'Train a tiny GPT',
      desc: 'Pretraining for real: data, tokens, loss curves, and the moment your model starts to make sense.',
      minutes: 125,
      project: 'A ~15M parameter GPT that writes stories',
      keywords: ['pretraining', 'scaling laws', 'KV cache', 'sampling', 'perplexity']
    },
    {
      id: '05', part: 'ii',
      title: 'Fine-tuning and LoRA',
      short: 'Fine-tuning & LoRA',
      desc: 'Take somebody else\'s model and teach it your task, changing less than 1% of the weights.',
      minutes: 105,
      project: 'LoRA fine-tune a small open model',
      keywords: ['SFT', 'LoRA', 'QLoRA', 'chat template', 'DPO']
    },
    {
      id: '06', part: 'iii',
      title: 'Distillation: teacher to student',
      short: 'Distillation',
      desc: 'A big model already knows the answer. Copy its *confidence*, not just its answers.',
      minutes: 105,
      project: 'Shrink a model 5x and keep its skill',
      keywords: ['soft targets', 'temperature', 'KL divergence', 'pruning', 'sparsity']
    },
    {
      id: '07', part: 'iii',
      title: 'Quantization: fewer bits',
      short: 'Quantization',
      desc: 'Why 4 bits per weight is usually enough, what breaks when it is not, and how to check.',
      minutes: 105,
      project: 'FP32 to INT4, measured honestly',
      keywords: ['scale', 'zero point', 'PTQ', 'QAT', 'outliers']
    },
    {
      id: '08', part: 'iii',
      title: 'Latency and memory',
      short: 'Latency & memory',
      desc: 'Where the milliseconds actually go. Memory bandwidth, not maths, is usually the wall.',
      minutes: 105,
      project: 'Profile it, then make it twice as fast',
      keywords: ['memory bound', 'arithmetic intensity', 'batching', 'profiling', 'thermals']
    },
    {
      id: '09', part: 'iv',
      title: 'Export: leaving PyTorch',
      short: 'Export',
      desc: 'One graph, many runtimes: torch.export, ONNX, ExecuTorch, Core ML, GGUF — and when to use which.',
      minutes: 130,
      project: 'The same model, four formats',
      keywords: ['torch.export', 'ONNX', 'ExecuTorch', 'Core ML', 'GGUF']
    },
    {
      id: '10', part: 'iv',
      title: 'On the device',
      short: 'On the device',
      desc: 'Running the model inside an iOS app and inside a browser tab, offline, with no server at all.',
      minutes: 105,
      project: 'Your model, in an app you can hold',
      keywords: ['Neural Engine', 'XNNPACK', 'WebGPU', 'transformers.js', 'cold start']
    },
    {
      id: '11', part: 'v',
      title: 'Tiny speech recognition',
      short: 'ASR',
      desc: 'Sound becomes a picture, the picture becomes letters. CTC, transducers, and why Whisper cannot stream.',
      minutes: 140,
      project: 'Offline speech-to-text on a phone',
      keywords: ['mel spectrogram', 'CTC', 'RNN-T', 'Whisper', 'WER']
    },
    {
      id: '12', part: 'v',
      title: 'Tiny speech synthesis',
      short: 'TTS',
      desc: 'Text to phonemes to a spectrogram to a waveform — and how to get the first sound out fast.',
      minutes: 120,
      project: 'A voice that fits in 100 MB',
      keywords: ['G2P', 'duration', 'vocoder', 'HiFi-GAN', 'time to first audio']
    },
    {
      id: '13', part: 'v',
      title: 'Full-duplex conversation',
      short: 'Full-duplex',
      desc: 'Listening and speaking at the same time: turn-taking, barge-in, and a latency budget that adds up.',
      minutes: 115,
      project: 'A fully offline voice assistant',
      keywords: ['VAD', 'endpointing', 'barge-in', 'streaming', 'Moshi']
    }
  ],

  extras: [
    { href: 'glossary.html',  label: 'Glossary' },
    { href: 'toolkit.html',   label: 'Setup & toolkit' },
    { href: 'debugging.html', label: 'When it breaks' },
    { href: 'resources.html', label: 'Reading list' }
  ]
};
