import { JobDetails } from '../shared/types';
import { PlatformAdapter } from './genericAdapter';

export class WorkdayAdapter implements PlatformAdapter {
  detect(doc: Document): boolean {
    return (
      doc.location.href.includes('myworkdayjobs.com') ||
      doc.querySelector('[data-automation-id="workdayLogo"]') !== null
    );
  }

  extractJobDetails(doc: Document): JobDetails {
    const roleEl = doc.querySelector('[data-automation-id="jobPostingHeader"], h2');
    const locationEl = doc.querySelector('[data-automation-id="location"], .css-12345'); // Workday dynamic classes

    // Guess company from subdomain
    let company = 'Workday Client';
    try {
      const hostname = doc.location.hostname;
      if (hostname.includes('.myworkdayjobs.com')) {
        company = hostname.split('.')[0].replace(/-/g, ' ').toUpperCase();
      }
    } catch {
      // Ignored
    }

    return {
      company,
      role: roleEl?.textContent?.trim() || 'Unknown Role',
      location: locationEl?.textContent?.trim() || 'Unspecified Location',
      description: doc.querySelector('[data-automation-id="jobDescription"]')?.textContent?.slice(0, 1000) || '',
      platform: 'Workday'
    };
  }
}
