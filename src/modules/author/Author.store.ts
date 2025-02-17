import {
  PROCESSED_AUTHOR_CSV_FILE,
  PROCESSED_AUTHOR_FOLDER,
  WORKING_AUTHOR_CSV_FILE,
} from '../../constants';
import {createObjectCsvWriter} from 'csv-writer';
import fs from 'fs';
import csvParser from 'csv-parser';
import {Author, createAuthor} from './Author';

export const CSV_HEADERS = [
  {id: 'author', title: 'Author'},
  {id: 'firstActiveDate', title: 'First Active Date'},
  {id: 'lastActiveDate', title: 'Last Active Date'},
  {id: 'totalCommits', title: 'Total Commits'},
  {id: 'totalPRs', title: 'Total PRs'},
  {id: 'totalPRCommentsGiven', title: 'Total PR Comments Given'},
  {id: 'totalPRReviews', title: 'Total PR Reviews'},
  {id: 'prSizeCounts.elite', title: 'PR Size Elite'},
  {id: 'prSizeCounts.good', title: 'PR Size Good'},
  {id: 'prSizeCounts.fair', title: 'PR Size Fair'},
  {id: 'prSizeCounts.needsFocus', title: 'PR Size Needs Focus'},
  {id: 'prSizePercentages.elite', title: 'PR Size % Elite'},
  {id: 'prSizePercentages.good', title: 'PR Size % Good'},
  {id: 'prSizePercentages.fair', title: 'PR Size % Fair'},
  {id: 'prSizePercentages.needsFocus', title: 'PR Size % Needs Focus'},
  {id: 'prMaturityCounts.elite', title: 'PR Maturity Elite'},
  {id: 'prMaturityCounts.good', title: 'PR Maturity Good'},
  {id: 'prMaturityCounts.fair', title: 'PR Maturity Fair'},
  {id: 'prMaturityCounts.needsFocus', title: 'PR Maturity Needs Focus'},
  {id: 'prMaturityPercentages.elite', title: 'PR Maturity % Elite'},
  {id: 'prMaturityPercentages.good', title: 'PR Maturity % Good'},
  {id: 'prMaturityPercentages.fair', title: 'PR Maturity % Fair'},
  {id: 'prMaturityPercentages.needsFocus', title: 'PR Maturity % Needs Focus'},
  {id: 'codingTimeCounts.elite', title: 'Coding Time Elite'},
  {id: 'codingTimeCounts.good', title: 'Coding Time Good'},
  {id: 'codingTimeCounts.fair', title: 'Coding Time Fair'},
  {id: 'codingTimeCounts.needsFocus', title: 'Coding Time Needs Focus'},
  {id: 'codingTimePercentages.elite', title: 'Coding Time % Elite'},
  {id: 'codingTimePercentages.good', title: 'Coding Time % Good'},
  {id: 'codingTimePercentages.fair', title: 'Coding Time % Fair'},
  {id: 'codingTimePercentages.needsFocus', title: 'Coding Time % Needs Focus'},
  {id: 'titleMaturityPercentages.elite', title: 'Title Maturity % Elite'},
  {id: 'titleMaturityPercentages.good', title: 'Title Maturity % Good'},
  {id: 'titleMaturityPercentages.fair', title: 'Title Maturity % Fair'},
  {
    id: 'titleMaturityPercentages.needsFocus',
    title: 'Title Maturity % Needs Focus',
  },
  {id: 'titleMaturityCounts.elite', title: 'Title Counts Elite'},
  {id: 'titleMaturityCounts.good', title: 'Title Counts Good'},
  {id: 'titleMaturityCounts.fair', title: 'Title Counts Fair'},
  {id: 'titleMaturityCounts.needsFocus', title: 'Title Counts Needs Focus'},
  {id: 'prCommentGivenMaturityPercentages.elite', title: 'Comments % Elite'},
  {id: 'prCommentGivenMaturityPercentages.good', title: 'Comments % Good'},
  {id: 'prCommentGivenMaturityPercentages.fair', title: 'Comments % Fair'},
  {
    id: 'prCommentGivenMaturityPercentages.needsFocus',
    title: 'Comments % Needs Focus',
  },
  {id: 'prCommentGivenMaturityCounts.elite', title: 'Comments Counts Elite'},
  {id: 'prCommentGivenMaturityCounts.good', title: 'Comments Counts Good'},
  {id: 'prCommentGivenMaturityCounts.fair', title: 'Comments Counts Fair'},
  {
    id: 'prCommentGivenMaturityCounts.needsFocus',
    title: 'Comments Counts Needs Focus',
  },
];

export class AuthorStore {
  constructor() {
    if (!fs.existsSync(PROCESSED_AUTHOR_FOLDER))
      fs.mkdirSync(PROCESSED_AUTHOR_FOLDER, {recursive: true});
  }

  public loadAuthorsRecords = async (): Promise<Record<string, Author>> => {
    return new Promise((resolve, reject) => {
      const authors: Record<string, Author> = {};

      if (!fs.existsSync(WORKING_AUTHOR_CSV_FILE)) {
        return resolve(authors); // If file doesn't exist, return empty object
      }

      fs.createReadStream(WORKING_AUTHOR_CSV_FILE)
        .pipe(csvParser({headers: CSV_HEADERS.map(h => h.id), skipLines: 1})) // Skip the header row
        .on('data', row => {
          if (row.author) {
            const author = createAuthor(row.author);
            if (row.firstActiveDate)
              author.firstActiveDate = new Date(row.firstActiveDate);
            if (row.lastActiveDate)
              author.lastActiveDate = new Date(row.lastActiveDate);
            if (row.totalCommits)
              author.totalCommits = parseInt(row.totalCommits, 10);
            if (row.totalPRs) author.totalPRs = parseInt(row.totalPRs, 10);
            if (row.totalPRCommentsGiven)
              author.totalPRCommentsGiven = parseInt(
                row.totalPRCommentsGiven,
                10,
              );
            if (row.totalPRReviews)
              author.totalPRReviews = parseInt(row.totalPRReviews, 10);

            if (row['prSizeCounts.elite'])
              author.prSizeCounts.elite = parseInt(
                row['prSizeCounts.elite'],
                10,
              );
            if (row['prSizeCounts.good'])
              author.prSizeCounts.good = parseInt(row['prSizeCounts.good'], 10);
            if (row['prSizeCounts.fair'])
              author.prSizeCounts.fair = parseInt(row['prSizeCounts.fair'], 10);
            if (row['prSizeCounts.needsFocus'])
              author.prSizeCounts.needsFocus = parseInt(
                row['prSizeCounts.needsFocus'],
                10,
              );

            if (row['prSizePercentages.elite'])
              author.prSizePercentages.elite = parseInt(
                row['prSizePercentages.elite'],
                10,
              );
            if (row['prSizePercentages.good'])
              author.prSizePercentages.good = parseInt(
                row['prSizePercentages.good'],
                10,
              );
            if (row['prSizePercentages.fair'])
              author.prSizePercentages.fair = parseInt(
                row['prSizePercentages.fair'],
                10,
              );
            if (row['prSizePercentages.needsFocus'])
              author.prSizePercentages.needsFocus = parseInt(
                row['prSizePercentages.needsFocus'],
                10,
              );

            if (row['prMaturityCounts.elite'])
              author.prMaturityCounts.elite = parseInt(
                row['prMaturityCounts.elite'],
                10,
              );
            if (row['prMaturityCounts.good'])
              author.prMaturityCounts.good = parseInt(
                row['prMaturityCounts.good'],
                10,
              );
            if (row['prMaturityCounts.fair'])
              author.prMaturityCounts.fair = parseInt(
                row['prMaturityCounts.fair'],
                10,
              );
            if (row['prMaturityCounts.needsFocus'])
              author.prMaturityCounts.needsFocus = parseInt(
                row['prMaturityCounts.needsFocus'],
                10,
              );

            if (row['prMaturityPercentages.elite'])
              author.prMaturityPercentages.elite = parseInt(
                row['prMaturityPercentages.elite'],
                10,
              );
            if (row['prMaturityPercentages.good'])
              author.prMaturityPercentages.good = parseInt(
                row['prMaturityPercentages.good'],
                10,
              );
            if (row['prMaturityPercentages.fair'])
              author.prMaturityPercentages.fair = parseInt(
                row['prMaturityPercentages.fair'],
                10,
              );
            if (row['prMaturityPercentages.needsFocus'])
              author.prMaturityPercentages.needsFocus = parseInt(
                row['prMaturityPercentages.needsFocus'],
                10,
              );

            if (row['codingTimeCounts.elite'])
              author.codingTimeCounts.elite = parseInt(
                row['codingTimeCounts.elite'],
                10,
              );
            if (row['codingTimeCounts.good'])
              author.codingTimeCounts.good = parseInt(
                row['codingTimeCounts.good'],
                10,
              );
            if (row['codingTimeCounts.fair'])
              author.codingTimeCounts.fair = parseInt(
                row['codingTimeCounts.fair'],
                10,
              );
            if (row['codingTimeCounts.needsFocus'])
              author.codingTimeCounts.needsFocus = parseInt(
                row['codingTimeCounts.needsFocus'],
                10,
              );

            if (row['codingTimePercentages.elite'])
              author.codingTimePercentages.elite = parseInt(
                row['codingTimePercentages.elite'],
                10,
              );
            if (row['codingTimePercentages.good'])
              author.codingTimePercentages.good = parseInt(
                row['codingTimePercentages.good'],
                10,
              );
            if (row['codingTimePercentages.fair'])
              author.codingTimePercentages.fair = parseInt(
                row['codingTimePercentages.fair'],
                10,
              );
            if (row['codingTimePercentages.needsFocus'])
              author.codingTimePercentages.needsFocus = parseInt(
                row['codingTimePercentages.needsFocus'],
                10,
              );

            if (row['titleMaturityPercentages.elite'])
              author.titleMaturityPercentages.elite = parseInt(
                row['titleMaturityPercentages.elite'],
                10,
              );
            if (row['titleMaturityPercentages.good'])
              author.titleMaturityPercentages.good = parseInt(
                row['titleMaturityPercentages.good'],
                10,
              );
            if (row['titleMaturityPercentages.fair'])
              author.titleMaturityPercentages.fair = parseInt(
                row['titleMaturityPercentages.fair'],
                10,
              );
            if (row['titleMaturityPercentages.needsFocus'])
              author.titleMaturityPercentages.needsFocus = parseInt(
                row['titleMaturityPercentages.needsFocus'],
                10,
              );

            if (row['titleMaturityCounts.elite'])
              author.titleMaturityCounts.elite = parseInt(
                row['titleMaturityCounts.elite'],
                10,
              );
            if (row['titleMaturityCounts.good'])
              author.titleMaturityCounts.good = parseInt(
                row['titleMaturityCounts.good'],
                10,
              );
            if (row['titleMaturityCounts.fair'])
              author.titleMaturityCounts.fair = parseInt(
                row['titleMaturityCounts.fair'],
                10,
              );
            if (row['titleMaturityCounts.needsFocus'])
              author.titleMaturityCounts.needsFocus = parseInt(
                row['titleMaturityCounts.needsFocus'],
                10,
              );

            if (row['prCommentGivenMaturityPercentages.elite'])
              author.prCommentGivenMaturityPercentages.elite = parseInt(
                row['prCommentGivenMaturityPercentages.elite'],
                10,
              );
            if (row['prCommentGivenMaturityPercentages.good'])
              author.prCommentGivenMaturityPercentages.good = parseInt(
                row['prCommentGivenMaturityPercentages.good'],
                10,
              );
            if (row['prCommentGivenMaturityPercentages.fair'])
              author.prCommentGivenMaturityPercentages.fair = parseInt(
                row['prCommentGivenMaturityPercentages.fair'],
                10,
              );
            if (row['prCommentGivenMaturityPercentages.needsFocus'])
              author.prCommentGivenMaturityPercentages.needsFocus = parseInt(
                row['prCommentGivenMaturityPercentages.needsFocus'],
                10,
              );

            if (row['prCommentGivenMaturityCounts.elite'])
              author.prCommentGivenMaturityPercentages.elite = parseInt(
                row['prCommentGivenMaturityCounts.elite'],
                10,
              );
            if (row['prCommentGivenMaturityCounts.good'])
              author.prCommentGivenMaturityPercentages.good = parseInt(
                row['prCommentGivenMaturityCounts.good'],
                10,
              );
            if (row['prCommentGivenMaturityCounts.fair'])
              author.prCommentGivenMaturityPercentages.fair = parseInt(
                row['prCommentGivenMaturityCounts.fair'],
                10,
              );
            if (row['prCommentGivenMaturityCounts.needsFocus'])
              author.prCommentGivenMaturityPercentages.needsFocus = parseInt(
                row['prCommentGivenMaturityCounts.needsFocus'],
                10,
              );
            authors[row.author] = author;
          }
        })
        .on('end', () => resolve(authors))
        .on('error', error => reject(error));
    });
  };

  public saveProcessedAuthorMetricsCSV = async (authors: Author[]) => {
    const csvWriter = createObjectCsvWriter({
      path: WORKING_AUTHOR_CSV_FILE,
      header: CSV_HEADERS,
      append: false,
    });
    const csvRecords = [];
    for (const author of authors) {
      csvRecords.push({
        author: author.author,
        firstActiveDate: author.firstActiveDate?.toISOString(),
        lastActiveDate: author.lastActiveDate?.toISOString(),
        totalCommits: author.totalCommits,
        totalPRs: author.totalPRs,
        totalPRCommentsGiven: author.totalPRCommentsGiven,
        totalPRReviews: author.totalPRReviews,
        'prSizeCounts.elite': author.prSizeCounts.elite,
        'prSizeCounts.good': author.prSizeCounts.good,
        'prSizeCounts.fair': author.prSizeCounts.fair,
        'prSizeCounts.needsFocus': author.prSizeCounts.needsFocus,
        'prSizePercentages.elite': author.prSizePercentages.elite,
        'prSizePercentages.good': author.prSizePercentages.good,
        'prSizePercentages.fair': author.prSizePercentages.fair,
        'prSizePercentages.needsFocus': author.prSizePercentages.needsFocus,
        'prMaturityCounts.elite': author.prMaturityCounts.elite,
        'prMaturityCounts.good': author.prMaturityCounts.good,
        'prMaturityCounts.fair': author.prMaturityCounts.fair,
        'prMaturityCounts.needsFocus': author.prMaturityCounts.needsFocus,
        'prMaturityPercentages.elite': author.prMaturityPercentages.elite,
        'prMaturityPercentages.good': author.prMaturityPercentages.good,
        'prMaturityPercentages.fair': author.prMaturityPercentages.fair,
        'prMaturityPercentages.needsFocus':
          author.prMaturityPercentages.needsFocus,
        'codingTimeCounts.elite': author.codingTimeCounts.elite,
        'codingTimeCounts.good': author.codingTimeCounts.good,
        'codingTimeCounts.fair': author.codingTimeCounts.fair,
        'codingTimeCounts.needsFocus': author.codingTimeCounts.needsFocus,
        'codingTimePercentages.elite': author.codingTimePercentages.elite,
        'codingTimePercentages.good': author.codingTimePercentages.good,
        'codingTimePercentages.fair': author.codingTimePercentages.fair,
        'codingTimePercentages.needsFocus':
          author.codingTimePercentages.needsFocus,
        'titleMaturityPercentages.elite': author.titleMaturityPercentages.elite,
        'titleMaturityPercentages.good': author.titleMaturityPercentages.good,
        'titleMaturityPercentages.fair': author.titleMaturityPercentages.fair,
        'titleMaturityPercentages.needsFocus':
          author.titleMaturityPercentages.needsFocus,
        'titleMaturityCounts.elite': author.titleMaturityCounts.elite,
        'titleMaturityCounts.good': author.titleMaturityCounts.good,
        'titleMaturityCounts.fair': author.titleMaturityCounts.fair,
        'titleMaturityCounts.needsFocus': author.titleMaturityCounts.needsFocus,
        'prCommentGivenMaturityPercentages.elite':
          author.prCommentGivenMaturityPercentages.elite,
        'prCommentGivenMaturityPercentages.good':
          author.prCommentGivenMaturityPercentages.good,
        'prCommentGivenMaturityPercentages.fair':
          author.prCommentGivenMaturityPercentages.fair,
        'prCommentGivenMaturityPercentages.needsFocus':
          author.prCommentGivenMaturityPercentages.needsFocus,
        'prCommentGivenMaturityCounts.elite':
          author.prCommentGivenMaturityCounts.elite,
        'prCommentGivenMaturityCounts.good':
          author.prCommentGivenMaturityCounts.good,
        'prCommentGivenMaturityCounts.fair':
          author.prCommentGivenMaturityCounts.fair,
        'prCommentGivenMaturityCounts.needsFocus':
          author.prCommentGivenMaturityCounts.needsFocus,
      });
    }

    await csvWriter.writeRecords(csvRecords);
    fs.copyFileSync(WORKING_AUTHOR_CSV_FILE,PROCESSED_AUTHOR_CSV_FILE);
  };
}
