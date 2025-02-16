import path from "path";
import {format} from "date-fns";
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({path: process.argv[2] || '../.env'});

export const START_DATE = process.env.START_DATE;
export const OUTPUT_PATH = path.resolve(__dirname, process.env.OUTPUT_PATH || '../../output');
export const REPO_DIR = path.resolve(OUTPUT_PATH, 'repos');
export const TIMESTAMP = format(new Date(), 'yyyyMMdd_HHmmss');
export const PROCESSED_PR_FOLDER = `${OUTPUT_PATH}/ProcessedPRs`;
export const WORKING_PR_FOLDER = `${OUTPUT_PATH}/PullRequests`;
export const PROCESSED_AUTHOR_FOLDER = `${OUTPUT_PATH}/ProcessedAuthors`;
export const PROCESSED_AUTHOR_CSV_FILE = `${PROCESSED_AUTHOR_FOLDER}/Authors_${TIMESTAMP}.csv`;
export const WORKING_AUTHOR_CSV_FILE = `${OUTPUT_PATH}/Authors.csv`;
export const ORG_NAME = process.env.ORG_NAME;
export const USER_NAME = process.env.USER_NAME;
export const PAGE_SIZE = process.env.PAGE_SIZE || 100;
export const PR_TITLE_MATURITY_LENGTH = process.env.PR_TITLE_MATURITY_LENGTH || 40;
export const COMMENT_MATURITY_LENGTH = process.env.COMMENT_MATURITY_LENGTH || 40;
export const REPO_NAME = process.env.REPO_NAME;

try {
    if (!fs.existsSync(REPO_DIR)) fs.mkdirSync(REPO_DIR, {recursive: true});
} catch (error: any) {
    console.error("Error creating directory: ", error);
    throw error;
}
