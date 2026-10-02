export type InterviewStatus = 'in_progress' | 'completed' | 'abandoned';

export interface ApplicationStage {
  id: string;
  interviewerRole: string;
  status: InterviewStatus;
}

/** A Document attached to an Application, with its name so it can be shown without a lookup. */
export interface ApplicationDocument {
  id: string;
  name: string;
}

export interface Application {
  id: string;
  companyName: string;
  jobTitle: string;
  jobDescription: ApplicationDocument | null;
  cv: ApplicationDocument | null;
  coverLetter: ApplicationDocument | null;
  interviews: ApplicationStage[];
}
