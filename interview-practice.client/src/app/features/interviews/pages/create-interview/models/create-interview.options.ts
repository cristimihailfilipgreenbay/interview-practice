import {
  Difficulty,
  InterviewerRole,
  InterviewType,
  ResponseStyle,
  Seniority,
  Tone,
} from './create-interview.schema';

/** Maps a select value to its label */
export function labelOf(options: readonly { value: string; label: string }[]) {
  return (value: unknown): string => options.find((option) => option.value === value)?.label ?? '';
}

export const SENIORITIES: readonly { value: Seniority; label: string }[] = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
];

export const DIFFICULTIES: readonly { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export const INTERVIEW_TYPES: readonly { value: InterviewType; label: string; icon: string }[] = [
  { value: 'technical', label: 'Technical', icon: 'lucideCode' },
  { value: 'behavioral', label: 'Behavioral', icon: 'lucideMessageSquare' },
];

export const RESPONSE_STYLES: readonly { value: ResponseStyle; label: string }[] = [
  { value: 'concise', label: 'Concise' },
  { value: 'detailed', label: 'Detailed' },
];

export const INTERVIEWER_ROLES: readonly { value: InterviewerRole; label: string }[] = [
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'technical_screener', label: 'Technical screener' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'hiring_manager', label: 'Hiring manager' },
];

export const INTERVIEWER_TONES: readonly { value: Tone; label: string }[] = [
  { value: 'strict', label: 'Strict' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'friendly', label: 'Friendly' },
];

/** What picking a difficulty seeds */
export const DIFFICULTY_DEFAULTS: Record<
  Difficulty,
  {
    targetQuestionCount: number;
    tone: Tone;
    interviewType: InterviewType;
    responseStyle: ResponseStyle;
    coachingHelpersEnabled: boolean;
  }
> = {
  easy: {
    targetQuestionCount: 5,
    tone: 'friendly',
    interviewType: 'behavioral',
    responseStyle: 'concise',
    coachingHelpersEnabled: true,
  },
  medium: {
    targetQuestionCount: 8,
    tone: 'neutral',
    interviewType: 'behavioral',
    responseStyle: 'concise',
    coachingHelpersEnabled: false,
  },
  hard: {
    targetQuestionCount: 12,
    tone: 'strict',
    interviewType: 'technical',
    responseStyle: 'detailed',
    coachingHelpersEnabled: false,
  },
};

/** What picking an interviewer role seeds; both stay editable (the last pick wins). */
export const ROLE_DEFAULTS: Record<InterviewerRole, { interviewType: InterviewType; tone: Tone }> =
  {
    recruiter: { interviewType: 'behavioral', tone: 'friendly' },
    technical_screener: { interviewType: 'technical', tone: 'strict' },
    hr: { interviewType: 'behavioral', tone: 'neutral' },
    hiring_manager: { interviewType: 'technical', tone: 'friendly' },
  };
