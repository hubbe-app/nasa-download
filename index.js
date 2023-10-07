const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Base URL of the website
const BASE_URL = 'https://standards.nasa.gov/all-standards';

// Directory to save the downloaded PDFs
const DOWNLOAD_DIR = 'NASA_Standards_PDFs';

// Function to create a directory if it doesn't exist
const createDirectory = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

// Function to download a PDF file
const downloadPDF = async (url, filePath) => {
  try {
    const response = await axios.get(url, { responseType: 'stream' });

    console.log(response);
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Failed to download: ${url}\nError: ${error.message}`);
  }
};

// Function to recursively download PDFs from second-level pages
const downloadPDFsFromSecondLevel = async (url) => {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Find and follow links to second-level pages
    const secondLevelLinks = [];
    $('a').each((index, element) => {
      const href = $(element).attr('href');
      if (href && href.startsWith('/')) {
        secondLevelLinks.push(new URL(href, BASE_URL).href);
      }
    });

    for (const secondLevelLink of secondLevelLinks) {
      await downloadPDFsFromSecondLevelPage(secondLevelLink);
    }
  } catch (error) {
    console.error(`Error while processing ${url}: ${error.message}`);
  }
};

// Function to download PDFs from a second-level page
const downloadPDFsFromSecondLevelPage = async (url) => {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Find and download PDF links
    $('a').each(async (index, element) => {
      const href = $(element).attr('href');
      if (href && href.endsWith('.pdf')) {
        const pdfUrl = new URL(href, BASE_URL).href;
        const pdfFileName = path.join(DOWNLOAD_DIR, path.basename(pdfUrl));
        await downloadPDF(pdfUrl, pdfFileName);
      }
    });
  } catch (error) {
    console.error(`Error while processing ${url}: ${error.message}`);
  }
};

// Start the recursive download
createDirectory(DOWNLOAD_DIR);
downloadPDFsFromSecondLevel(BASE_URL);