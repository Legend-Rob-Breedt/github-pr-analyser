import fs from "fs";
import {PROCESSED_PR_CSV_FILE, WORKING_PR_CSV_FILE} from "../../constants";
import {createObjectCsvWriter} from "csv-writer";
import csvParser from "csv-parser";

const CSV_HEADERS = [
  {id: 'repository', title: 'Repository'},
  {id: 'number', title: 'PR Number'},
  {id: 'title', title: 'Title'},
  {id: 'author', title: 'Author'},
  {id: 'createdAt', title: 'Created At'},
  {id: 'mergedAt', title: 'Merged At'},
  {id: 'mergeState', title: 'Merge State'},
  {id: 'state', title: 'State'},
  {id: 'additions', title: 'PR Additions'},
  {id: 'deletions', title: 'PR Deletions'},
  {id: 'size',  title: 'Size'},
  {id: 'lastProcessed', title: 'Last Processed'},
  {id: 'initialCommitsCount', title: 'Initial Commits Count'},
  {id: 'initialCommitAdditions', title: 'Initial Commit Additions'},
  {id: 'initialCommitDeletions', title: 'Initial Commit Deletions'},
  {id: 'reworkCommitsCount', title: 'Rework Commits Count'},
  {id: 'reworkCommitsAdditions', title: 'Rework Commits Additions'},
  {id: 'reworkCommitsDeletions', title: 'Rework Commits Deletions'},
  {id: 'totalPRChangeAdditions', title: 'Total PR Change Additions'},
  {id: 'totalPRChangeDeletions', title: 'Total PR Change Deletions'},
  {id: 'maturity', title: 'Maturity'},
  {id: 'codingTime', title: 'Coding Time'},
  {id: 'initialCommitCreatedAt', title: 'Initial Commit Created At'},
  {id: 'lastCommitCreatedAt', title: 'Last Commit Created At'},
  {id: 'titleMaturity', title: 'Title Maturity'},
];

export const loadHistoricalPullRequest = (repoName: string) => {
  const historicalRecords: Record<string, any> = {};
  if (fs.existsSync(WORKING_PR_CSV_FILE)) {
    fs.createReadStream(WORKING_PR_CSV_FILE)
      .pipe(csvParser({headers: CSV_HEADERS.map(h => h.id)}))
      .on('data', (row) => {
        if (row.repository === repoName) {
          historicalRecords[row.number] = row;
        }
      });
  }
  return historicalRecords;
};

export const saveProcessedPullRequestCSV = async (data: any[]) => {
  const csvWriter = createObjectCsvWriter({
    path: PROCESSED_PR_CSV_FILE,
    header: CSV_HEADERS,
    append: fs.existsSync(PROCESSED_PR_CSV_FILE)
  });
  await csvWriter.writeRecords(data);
  fs.copyFileSync(PROCESSED_PR_CSV_FILE, WORKING_PR_CSV_FILE);
};
