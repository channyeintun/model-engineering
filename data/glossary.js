/* =========================================================================
   Glossary. Every entry is written for a reader whose English is strong but
   not native: short sentences, no idioms, no jargon inside the definition.
   `short` shows in the hover tooltip. `long` shows on glossary.html.
   Keys are lower case and are what you put in data-term="…".
   ========================================================================= */

window.GLOSSARY = {

  /* ---- Part I ---------------------------------------------------------- */

  'tensor': {
    term: 'Tensor', part: 'i',
    short: 'An array of numbers with a shape. A number, a list, a table, or a stack of tables — all are tensors.',
    long: 'The single data type you pass around in PyTorch. A tensor has a shape such as (32, 1, 28, 28) and a data type such as float32. Almost every bug you will meet is a shape that does not match.'
  },
  'parameters': {
    term: 'Parameter', part: 'i',
    short: 'A number inside the model that training is allowed to change. Also called a weight.',
    long: 'Parameters are what the model learns. "A 1B model" means one billion of these numbers. They are stored, shipped and quantized — everything in Part III is about making them smaller.'
  },
  'loss': {
    term: 'Loss', part: 'i',
    short: 'One number that says how wrong the model is right now. Training tries to make it smaller.',
    long: 'Also called cost or objective. It must be a single number, because gradient descent can only walk downhill on one surface. Which loss you choose defines what the model actually learns.'
  },
  'gradient': {
    term: 'Gradient', part: 'i',
    short: 'For one parameter: how much the loss would change if you nudged that parameter a little.',
    long: 'A gradient carries direction and steepness in one number. Negative means "increase this parameter to lower the loss". The update rule subtracts the gradient, which is why a negative gradient raises the parameter.'
  },
  'learning rate': {
    term: 'Learning rate', part: 'i',
    short: 'How big a step to take downhill. Usually written lr. The most important number you choose by hand.',
    long: 'Too small and training takes forever. Too large and the loss jumps over the valley and grows. Typical values are 1e-3 for small models trained from scratch and 1e-4 to 2e-4 for fine-tuning.'
  },
  'chain rule': {
    term: 'Chain rule', part: 'i',
    short: 'If a affects b and b affects c, then the effect of a on c is the two effects multiplied together.',
    long: 'This is the whole mathematical content of backpropagation. Each operation knows its own local derivative; the backward pass multiplies them together from the loss back to every parameter.'
  },
  'softmax': {
    term: 'Softmax', part: 'i',
    short: 'Turns any list of raw scores into probabilities: all positive, adding up to 1.',
    long: 'It exponentiates each score and divides by the total. Because of the exponential, a score that is 2 higher becomes about 7 times more likely. Temperature in text generation is a division applied before softmax.'
  },
  'logits': {
    term: 'Logits', part: 'i',
    short: 'The raw, unnormalised scores a model produces, before softmax turns them into probabilities.',
    long: 'PyTorch loss functions such as nn.CrossEntropyLoss expect logits and apply softmax internally. Adding your own softmax before them is a common and silent bug.'
  },
  'epoch': {
    term: 'Epoch', part: 'i',
    short: 'One complete pass over the training data.',
    long: 'Small models often train for several epochs. Large language models usually see most of their data only once, so people count tokens instead of epochs.'
  },
  'batch': {
    term: 'Batch', part: 'i',
    short: 'A group of examples processed together for speed. Almost always the first dimension of a tensor.',
    long: 'Examples in a batch do not mix; batching exists because hardware is far faster on many rows at once than on one row at a time. This fact returns in Lesson 08, where batch size decides whether you are compute-bound or memory-bound.'
  },
  'overfitting': {
    term: 'Overfitting', part: 'i',
    short: 'The model memorises the training data and becomes worse on data it has not seen.',
    long: 'You detect it by holding out a validation set. When training loss falls but validation loss rises, stop and keep the earlier checkpoint.'
  },
  'activation': {
    term: 'Activation', part: 'i',
    short: 'Two meanings: the output of a layer, and the small non-linear function such as ReLU applied to it.',
    long: 'Without a non-linear activation, stacked linear layers collapse into a single linear layer, so depth buys you nothing. Modern language models mostly use GELU or SwiGLU rather than ReLU.'
  },

  /* ---- Part II --------------------------------------------------------- */

  'token': {
    term: 'Token', part: 'ii',
    short: 'The unit a language model reads and writes. Usually a piece of a word, not a whole word.',
    long: 'English text is roughly 4 characters per token. A tokenizer splits text into tokens and maps each to an integer id. Different models use different tokenizers, so token counts are not comparable between them.'
  },
  'embedding': {
    term: 'Embedding', part: 'ii',
    short: 'A lookup table that turns a token id into a vector of numbers the model can work with.',
    long: 'Shape is (vocabulary size, model width). In small models this table can be a large share of all parameters, which is why many small models tie the input and output embedding to the same weights.'
  },
  'attention': {
    term: 'Attention', part: 'ii',
    short: 'A step where each token looks at the other tokens and pulls in what is relevant to it.',
    long: 'Each token produces a query, a key and a value. Scores come from query-key dot products, softmax turns them into weights, and the output is a weighted sum of values. Cost grows with the square of sequence length.'
  },
  'kv cache': {
    term: 'KV cache', part: 'ii',
    short: 'Stored keys and values from earlier tokens, so generating the next token does not redo all the work.',
    long: 'Without it, generating token 500 would recompute tokens 1 to 499. With it, each new token is cheap in compute but the cache grows with context length and eats memory. On a phone the KV cache is often the real memory limit, not the weights.'
  },
  'pretraining': {
    term: 'Pretraining', part: 'ii',
    short: 'The first, expensive training run on a very large amount of general text.',
    long: 'The model learns to predict the next token. This is where general ability comes from. Everything after it — fine-tuning, alignment — is comparatively cheap.'
  },
  'fine-tuning': {
    term: 'Fine-tuning', part: 'ii',
    short: 'Continuing to train an already trained model on a smaller, more specific dataset.',
    long: 'It is far cheaper than pretraining and needs far less data. The risk is catastrophic forgetting: the model gets better at your task and worse at everything else.'
  },
  'lora': {
    term: 'LoRA', part: 'ii',
    short: 'Freeze the original weights and learn a small pair of thin matrices beside them instead.',
    long: 'Low-Rank Adaptation. Instead of updating a large weight matrix W, you learn B and A where B·A has the same shape but far fewer parameters. Typically under 1% of the model is trained, and the result can be merged back into W afterwards.'
  },
  'perplexity': {
    term: 'Perplexity', part: 'ii',
    short: 'The exponential of the loss. Roughly: how many options the model was choosing between at each token.',
    long: 'Perplexity 1 means perfect certainty. A perplexity of 20 means the model was about as unsure as if it had picked uniformly among 20 tokens. It is comparable only between models that use the same tokenizer.'
  },

  /* ---- Part III -------------------------------------------------------- */

  'distillation': {
    term: 'Distillation', part: 'iii',
    short: 'Train a small model to copy the full output distribution of a large one, not just its final answers.',
    long: 'The large model is the teacher, the small one the student. The teacher\'s uncertainty carries information — that a 7 looks a bit like a 1 — which a plain label does not contain.'
  },
  'quantization': {
    term: 'Quantization', part: 'iii',
    short: 'Storing weights with fewer bits, for example 4 instead of 32, so the model is smaller and faster to read.',
    long: 'Each group of weights gets a scale factor, so the small integers can be mapped back to real values. The gain is mostly memory bandwidth, which is what actually limits generation speed on a device.'
  },
  'ptq': {
    term: 'PTQ', part: 'iii',
    short: 'Post-training quantization: take a finished model and reduce its precision, with no further training.',
    long: 'Fast — minutes, not hours — and good enough for most weight-only 8-bit and 4-bit work. It needs a small calibration set when activations are quantized too.'
  },
  'qat': {
    term: 'QAT', part: 'iii',
    short: 'Quantization-aware training: simulate the rounding error during training so the model learns to tolerate it.',
    long: 'More expensive than PTQ but recovers accuracy at very low precision. It uses a straight-through estimator: round in the forward pass, pretend the rounding was the identity in the backward pass.'
  },
  'pruning': {
    term: 'Pruning', part: 'iii',
    short: 'Deleting weights, channels or whole layers that contribute little, then training briefly to recover.',
    long: 'Unstructured pruning removes individual weights and rarely speeds anything up, because the hardware still reads the zeros. Structured pruning removes whole rows or heads and gives real speed-ups.'
  },
  'memory bound': {
    term: 'Memory-bound', part: 'iii',
    short: 'The chip is waiting for numbers to arrive from memory, not doing arithmetic. Most generation is like this.',
    long: 'Generating one token reads every weight once and does very little maths per weight. So the speed limit is memory bandwidth in gigabytes per second, which is why halving the model size roughly halves the time per token.'
  },

  /* ---- Part IV --------------------------------------------------------- */

  'onnx': {
    term: 'ONNX', part: 'iv',
    short: 'A portable file format for a trained model graph, readable by many runtimes on many platforms.',
    long: 'You export from PyTorch to ONNX, then run it with ONNX Runtime on a server, a phone or in a browser. It is the widest-reach option, though not always the fastest on a given device.'
  },
  'executorch': {
    term: 'ExecuTorch', part: 'iv',
    short: 'PyTorch\'s own on-device runtime. You export a .pte file and run it on phones and embedded devices.',
    long: 'It starts from torch.export, then lowers the graph to backends such as XNNPACK for CPU, Core ML and Metal on Apple devices, or vendor NPUs. It keeps you inside the PyTorch toolchain from training to device.'
  },
  'core ml': {
    term: 'Core ML', part: 'iv',
    short: 'Apple\'s on-device model format and runtime. It is the way to reach the Neural Engine on iPhone.',
    long: 'You convert with coremltools and run through the Core ML framework, which chooses between CPU, GPU and the Neural Engine. The Neural Engine is very efficient but accepts a restricted set of operations and shapes.'
  },
  'gguf': {
    term: 'GGUF', part: 'iv',
    short: 'The single-file format used by llama.cpp. It holds the weights, the quantization scheme and the tokenizer.',
    long: 'Names such as Q4_K_M describe how the weights were quantized. GGUF is the fastest route to running a small language model on a laptop or phone CPU, but it is a separate world from the PyTorch export path.'
  },
  'webgpu': {
    term: 'WebGPU', part: 'iv',
    short: 'A browser API that gives web pages real access to the GPU. It is what makes in-browser inference practical.',
    long: 'Before WebGPU, browser inference used WebAssembly on the CPU. WebGPU is much faster for the matrix work in a transformer, and it is what libraries such as transformers.js use when it is available.'
  },

  /* ---- Part V ---------------------------------------------------------- */

  'spectrogram': {
    term: 'Spectrogram', part: 'v',
    short: 'A picture of sound: time across, frequency up, brightness for energy.',
    long: 'Made by cutting audio into short overlapping windows and taking the frequency content of each. A mel spectrogram warps the frequency axis to match human hearing, which is why nearly every speech model uses one.'
  },
  'ctc': {
    term: 'CTC', part: 'v',
    short: 'A loss that lets a model output letters without being told which audio frame each letter belongs to.',
    long: 'Connectionist Temporal Classification. The model may emit a special blank symbol, and repeated symbols are collapsed. It sums over every alignment that produces the correct text, so no frame-level labels are needed.'
  },
  'wer': {
    term: 'WER', part: 'v',
    short: 'Word error rate: insertions plus deletions plus substitutions, divided by the number of true words.',
    long: 'Lower is better. 5% WER means one word in twenty is wrong. It can exceed 100% if the model produces more wrong words than there were words to begin with.'
  },
  'vad': {
    term: 'VAD', part: 'v',
    short: 'Voice activity detection: a tiny model that decides whether the current audio contains speech.',
    long: 'It gates the expensive parts of the pipeline so you do not run speech recognition on silence. Silero VAD is the common choice and is small enough to run everywhere.'
  },
  'vocoder': {
    term: 'Vocoder', part: 'v',
    short: 'The part of a speech synthesiser that turns a spectrogram back into an actual sound wave.',
    long: 'A spectrogram throws away phase information, so the vocoder has to invent it. Neural vocoders such as HiFi-GAN do this far better than the classic Griffin-Lim algorithm, and are usually the slowest part of a TTS system.'
  },
  'full-duplex': {
    term: 'Full-duplex', part: 'v',
    short: 'Listening and speaking at the same time, the way people actually talk — including being interrupted.',
    long: 'A half-duplex assistant waits for you to stop, then answers. A full-duplex one keeps its ears open while speaking, so it can be interrupted, can say "mm-hm" while you talk, and can decide when to start.'
  },
  'barge-in': {
    term: 'Barge-in', part: 'v',
    short: 'The user starts speaking while the assistant is still speaking, and the assistant stops to listen.',
    long: 'It needs echo cancellation, because the microphone hears the assistant\'s own voice from the speaker. Without cancellation the system interrupts itself constantly.'
  },
  'endpointing': {
    term: 'Endpointing', part: 'v',
    short: 'Deciding that the person has finished their turn, rather than just pausing to think.',
    long: 'A fixed silence timer is a bad detector: too short and you cut people off, too long and the assistant feels slow. Modern systems use the words as well as the silence to judge whether the sentence is complete.'
  },

  /* ---- added: acronyms the lessons use ---------------------------------- */

  'asr': {
    term: 'ASR', part: 'v',
    short: 'Automatic speech recognition: turning recorded speech into text. The "ears" of a voice assistant.',
    long: 'The model takes audio and produces the words that were spoken. The hard part is alignment: you have a thousand slices of sound and forty letters, and nobody told you which slice belongs to which letter.'
  },
  'tts': {
    term: 'TTS', part: 'v',
    short: 'Text to speech: turning written text into audio of a voice saying it. The "mouth" of a voice assistant.',
    long: 'Usually three stages: normalise the text so it can be read aloud, turn letters into sounds, then generate the waveform. The last stage is normally the slowest.'
  },
  'stft': {
    term: 'STFT', part: 'v',
    short: 'Short-time Fourier transform: cut the sound into short overlapping slices and measure which frequencies are in each one.',
    long: 'It is how a waveform becomes a picture. Each slice becomes one column of a spectrogram, so a long recording becomes an image with time across and frequency up.'
  },
  'mel': {
    term: 'Mel scale', part: 'v',
    short: 'A way of spacing frequency bands that matches human hearing: fine detail low down, coarse detail high up.',
    long: 'People hear the difference between 100 and 200 Hz easily, but 8000 and 8100 Hz sound the same. The mel scale squeezes the high frequencies so a model spends its capacity where hearing is sharp.'
  },
  'phoneme': {
    term: 'Phoneme', part: 'v',
    short: 'The smallest unit of sound that changes a word’s meaning. "Cat" is three of them.',
    long: 'Speech systems work in phonemes rather than letters because spelling lies: "through" and "threw" are spelled differently and sound the same, while "read" is spelled once and sounds two ways.'
  },
  'g2p': {
    term: 'G2P', part: 'v',
    short: 'Grapheme to phoneme: working out how written letters should actually be pronounced.',
    long: 'A lookup table handles common words; a small model or a rule set guesses the rest. Names and abbreviations are where it usually fails.'
  },
  'rnn-t': {
    term: 'RNN-T', part: 'v',
    short: 'Recurrent neural network transducer: a speech recogniser built to work while you are still speaking.',
    long: 'It is the usual choice on a phone because it can emit words as the audio arrives, rather than waiting for the sentence to finish the way an encoder-decoder model does.'
  },
  'npu': {
    term: 'NPU', part: 'iv',
    short: 'Neural processing unit: a chip on the device built only for the kind of arithmetic neural networks do.',
    long: 'Far more efficient per unit of battery than the CPU or GPU, but it accepts a restricted set of operations, so parts of a model often fall back to slower hardware. Apple calls its version the Neural Engine.'
  },
  'mlp': {
    term: 'MLP', part: 'i',
    short: 'Multi-layer perceptron: the plainest neural network — a stack of linear layers with a non-linear function between them.',
    long: 'Also called a feed-forward network or a dense network. Every transformer block contains one, so this is not just a beginner’s toy.'
  },
  'cnn': {
    term: 'CNN', part: 'i',
    short: 'Convolutional neural network: a network that slides a small window over an input, reusing the same weights everywhere.',
    long: 'Because the weights are shared, it needs far fewer parameters than a dense layer for images, and it does not care where in the picture something appears.'
  },
  'rnn': {
    term: 'RNN', part: 'i',
    short: 'Recurrent neural network: reads a sequence one step at a time, carrying a memory of what came before.',
    long: 'Largely replaced by transformers for language, because a transformer can look at the whole sequence in parallel while an RNN must wait for step by step. Still useful where input arrives continuously, such as speech.'
  },
  'gqa': {
    term: 'GQA', part: 'ii',
    short: 'Grouped-query attention: several query heads share one set of keys and values, to keep the cache small.',
    long: 'A middle point between one key-value set per head (most memory, best quality) and a single shared set. It is the standard choice in 2026 small models because the cache, not the weights, is often the memory limit on a phone.'
  },
  'mqa': {
    term: 'MQA', part: 'ii',
    short: 'Multi-query attention: every query head shares a single set of keys and values.',
    long: 'The most aggressive way to shrink the cache. Cheaper than grouped-query attention but usually costs more quality.'
  },
  'rope': {
    term: 'RoPE', part: 'ii',
    short: 'Rotary position embedding: tells the model where each token sits by rotating its query and key vectors.',
    long: 'Attention on its own is blind to order. Rotating by an angle proportional to position means the score between two tokens depends on the distance between them, which is what you want.'
  },

  /* ---- added: number formats and training vocabulary --------------------- */

  'fp32': {
    term: 'FP32', part: 'i',
    short: 'A number stored in 32 bits, four bytes. The default in PyTorch, and the baseline every other format is compared against.',
    long: 'One billion parameters in FP32 is 4 GB. Training normally keeps a master copy of the weights in FP32 even when the arithmetic runs in 16 bits.'
  },
  'fp16': {
    term: 'FP16 / BF16', part: 'i',
    short: 'A number stored in 16 bits, two bytes. Half the memory of FP32, and the usual precision for the arithmetic during training.',
    long: 'The two 16-bit formats split the bits differently. BF16 keeps FP32’s exponent range, so it rarely overflows and needs no loss scaling. FP16 has more precision but a much smaller range, which is why it needs a GradScaler. Lesson 07 explains the trade properly.'
  },
  'int8': {
    term: 'INT8 / INT4', part: 'iii',
    short: 'A whole number stored in 8 or 4 bits, with a separate scale factor that maps it back to a real value.',
    long: 'One billion parameters is 1 GB at INT8 and 0.5 GB at INT4. Integers have no exponent, so the scale factor does that job for a whole group of weights at once.'
  },
  'relu': {
    term: 'ReLU', part: 'i',
    short: 'Rectified linear unit: keep the number if it is positive, otherwise output zero. The simplest useful non-linearity.',
    long: 'Without something like it, stacked linear layers collapse into one linear layer. Its flat half is also its weakness: a unit whose input is always negative outputs zero forever and stops learning, which is called a dead unit.'
  },
  'channel': {
    term: 'Channel', part: 'i',
    short: 'One of the parallel feature maps in an image tensor. A colour photo has three; a grey image has one.',
    long: 'After the first convolution the channels stop being colours and start being learned features — an edge detector, a texture detector. The channel count is the second number in a (B, C, H, W) shape.'
  },
  'dropout': {
    term: 'Dropout', part: 'i',
    short: 'During training, randomly set some activations to zero so the model cannot rely on any single one.',
    long: 'It is switched off at evaluation time, which is one of the two things model.eval() changes. It reduces overfitting by forcing the network to spread what it knows across many units.'
  },
  'weight decay': {
    term: 'Weight decay', part: 'i',
    short: 'A gentle pull of every weight toward zero at each step, so the model prefers small numbers unless the data insists otherwise.',
    long: 'It reduces overfitting. AdamW exists because the obvious way of adding it to Adam is subtly wrong; the W is the corrected version, and it is what nearly every model in this course was trained with.'
  },
  'augmentation': {
    term: 'Augmentation', part: 'i',
    short: 'Making more training data by changing existing examples in ways that do not change the answer — flipping, cropping, adding noise.',
    long: 'A flipped photo of a cat is still a cat, so the label survives the change. It is the cheapest way to reduce overfitting when you cannot collect more data.'
  },
  'amp': {
    term: 'AMP', part: 'ii',
    short: 'Automatic mixed precision: run the heavy matrix maths in 16 bits while keeping the master weights in 32 bits.',
    long: 'Roughly halves activation memory and speeds up training, with the model quality essentially unchanged. With FP16 it needs a GradScaler, because small gradients would otherwise underflow to zero; with BF16 it does not.'
  }
};
