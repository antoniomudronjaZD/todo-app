import { type NextRequest } from "next/server";

interface Job {
  slug: string;
  company: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  jobTypes: string[];
  location: string;
  createdAt: number;
}

interface MatchResult {
  slug: string;
  company: string;
  title: string;
  location: string;
  url: string;
  tags: string[];
  remote: boolean;
  score: number;
  whyItFits: string;
  interviewQuestion: string;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function computeScore(
  skills: string[],
  targetRole: string,
  city: string,
  job: Job
): { score: number; skillHits: string[] } {
  const jobText = `${job.title} ${job.tags.join(" ")} ${job.description}`.toLowerCase();
  const jobTokens = new Set(tokenize(jobText));

  let skillHits: string[] = [];
  let skillScore = 0;

  for (const skill of skills) {
    const skillLower = skill.toLowerCase().trim();
    if (!skillLower) continue;
    if (jobText.includes(skillLower)) {
      skillHits.push(skill.trim());
      skillScore += 15;
    } else {
      const skillTokens = tokenize(skillLower);
      for (const st of skillTokens) {
        if (jobTokens.has(st)) {
          skillHits.push(skill.trim());
          skillScore += 5;
          break;
        }
      }
    }
  }

  let roleScore = 0;
  const roleTokens = tokenize(targetRole);
  for (const rt of roleTokens) {
    if (jobTokens.has(rt)) roleScore += 10;
  }

  let locationScore = 0;
  if (city) {
    const cityLower = city.toLowerCase();
    if (job.location.toLowerCase().includes(cityLower)) {
      locationScore = 20;
    } else if (job.remote && cityLower.includes("remote")) {
      locationScore = 20;
    } else if (job.remote) {
      locationScore = 5;
    }
  }

  const score = Math.min(100, skillScore + roleScore + locationScore);
  return { score, skillHits: [...new Set(skillHits)] };
}

function generateWhyItFits(
  skillHits: string[],
  targetRole: string,
  job: Job,
  city: string
): string {
  const parts: string[] = [];

  if (skillHits.length > 0) {
    const listed = skillHits.slice(0, 3).join(", ");
    parts.push(
      `Your experience with ${listed} directly aligns with this role's requirements.`
    );
  } else {
    parts.push(`This position is relevant to your ${targetRole} career path.`);
  }

  if (job.remote && city.toLowerCase().includes("remote")) {
    parts.push("The remote work option matches your location preference.");
  } else if (job.location.toLowerCase().includes(city.toLowerCase())) {
    parts.push(`The ${job.location} location matches your preferred area.`);
  } else {
    parts.push(
      `The position at ${job.company} offers valuable industry experience.`
    );
  }

  return parts.join(" ");
}

function generateInterviewQuestion(
  skillHits: string[],
  job: Job
): string {
  if (skillHits.length > 0) {
    const skill = skillHits[0];
    const questions = [
      `Can you walk me through a project where you used ${skill} to solve a real problem?`,
      `How would you approach building a new feature using ${skill} in a team setting?`,
      `Describe a challenging situation you faced while working with ${skill} and how you resolved it.`,
      `What best practices do you follow when working with ${skill}?`,
    ];
    return questions[job.slug.length % questions.length];
  }

  const generic = [
    `What interests you about working at ${job.company} as a ${job.title}?`,
    `Describe a time you had to quickly learn a new technology for a project.`,
    `How do you prioritize tasks when working on multiple features simultaneously?`,
    `Tell me about a project you're most proud of and why.`,
  ];
  return generic[job.slug.length % generic.length];
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { skills, targetRole, city, jobs } = body as {
    skills: string;
    targetRole: string;
    city: string;
    jobs: Job[];
  };

  if (!jobs || jobs.length === 0) {
    return Response.json(
      { error: "No jobs to match. Please search for jobs first." },
      { status: 400 }
    );
  }

  const skillList = skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const scored = jobs.map((job) => {
    const { score, skillHits } = computeScore(skillList, targetRole, city, job);
    return {
      slug: job.slug,
      company: job.company,
      title: job.title,
      location: job.location,
      url: job.url,
      tags: job.tags,
      remote: job.remote,
      score,
      whyItFits: generateWhyItFits(skillHits, targetRole, job, city),
      interviewQuestion: generateInterviewQuestion(skillHits, job),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const top5 = scored.slice(0, 5);

  return Response.json({ matches: top5 });
}
