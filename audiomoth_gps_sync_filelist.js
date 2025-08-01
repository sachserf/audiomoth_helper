const audiomothUtils = require('audiomoth-utils');
const fs = require('fs');
const path = require('path');

// Paths
const inputBase = path.resolve('wav');
const outputBase = path.resolve('wav_sync');
const fileListPath = path.resolve('files_wav.txt');
const summaryPath = path.resolve('sync_summary.csv');

const prefix = '';
const resampleRate = 48000;
const autoResolve = true;

// Read file paths
const filesToProcess = fs.readFileSync(fileListPath, 'utf-8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.endsWith('.WAV'));

if (filesToProcess.length === 0) {
    console.error('No valid .WAV paths found in files.txt.');
    process.exit(1);
}

// Prepare summary
const summary = [['File', 'OutputFolder', 'Success', 'Error', 'Skipped']];

filesToProcess.forEach(inputRelPath => {
    const absoluteInput = path.resolve(inputRelPath);
    const relativePath = path.relative(inputBase, absoluteInput);
    const outputFolder = path.join(outputBase, path.dirname(relativePath));

    const inputFileName = path.basename(absoluteInput);
    const outputFileName = prefix + inputFileName;
    const outputFilePath = path.join(outputFolder, outputFileName);

    // Skip if output file already exists
    if (fs.existsSync(outputFilePath)) {
	console.log(`Skipping (already processed): ${relativePath}`);
	summary.push([
	    relativePath,
	    path.relative(__dirname, outputFolder),
	    '',
	    '',
	    'yes'
	]);
	return;
    }

    // Ensure output directory exists
    fs.mkdirSync(outputFolder, { recursive: true });

    console.log(`Processing: ${relativePath}`);

    const result = audiomothUtils.sync(
	absoluteInput,
	outputFolder,
	prefix,
	resampleRate,
	autoResolve,
	(progress) => process.stdout.write(`  ${progress}%\r`)
    );

    summary.push([
	relativePath,
	path.relative(__dirname, outputFolder),
	result.success ? 'yes' : 'no',
	result.success ? '' : result.error,
	'no'
    ]);

    if (result.success) {
	console.log(`\n Done: ${relativePath}`);
    } else {
	console.error(`\n Failed: ${relativePath} — ${result.error}`);
    }
});

// Write summary CSV
const csvContent = summary.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
).join('\n');

fs.writeFileSync(summaryPath, csvContent, 'utf-8');
console.log(`\n Summary written to ${summaryPath}`);
