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
  score: number;
  whyItFits: string;
  interviewQuestion: string;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        error:
          "OpenRouter API key is not configured. Please add OPENROUTER_API_KEY to your environment variables.",
      },
      { status: 500 }
    );
  }

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

  const jobsSummary = jobs
    .map(
      (job, i) =>
        `[${i + 1}] ${job.title} at ${job.company} in ${job.location}${job.remote ? " (Remote)" : ""}\nTags: ${job.tags.join(", ")}\nDescription: ${job.description}`
    )
    .join("\n\n");

  const prompt = `You are a career matching assistant. A job seeker has the following profile:

Skills: ${skills}
Target Role: ${targetRole}
Preferred City: ${city}

Here are ${jobs.length} job listings to evaluate:

${jobsSummary}

Score each job 0-100 based on how well it matches the seeker's profile. Consider skill overlap, role alignment, and location preference.

Return ONLY a valid JSON array (no markdown, no code blocks) with exactly the top 5 jobs (or fewer if less than 5 exist), sorted by score descending. Each object must have:
- "slug": the job slug
- "score": integer 0-100
- "whyItFits": exactly two sentences explaining the match
- "interviewQuestion": one specific interview question the seeker should prepare for

Example format:
[{"slug":"abc","score":85,"whyItFits":"Your React experience directly matches their frontend needs. The remote option also aligns with your city preference.","interviewQuestion":"Can you describe a time you optimized a React component's performance?"}]`;

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://my-job-matcher.vercel.app",
          "X-Title": "My Job Matcher",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.1-8b-instruct:free",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      if (response.status === 401) {
        return Response.json(
          {
            error:
              "Invalid API key. Please check your OPENROUTER_API_KEY environment variable.",
          },
          { status: 401 }
        );
      }

      if (response.status === 429) {
        return Response.json(
          {
            error:
              "Rate limit exceeded. Please wait a moment and try again.",
          },
          { status: 429 }
        );
      }

      return Response.json(
        {
          error:
            errorData?.error?.message ||
            `OpenRouter API error: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return Response.json(
        { error: "No response from AI model. Please try again." },
        { status: 502 }
      );
    }

    let matches: MatchResult[];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      matches = JSON.parse(jsonMatch[0]);
    } catch {
      return Response.json(
        {
          error:
            "Failed to parse AI response. The model returned an unexpected format.",
          rawResponse: content,
        },
        { status: 502 }
      );
    }

    const enriched = matches.map((match) => {
      const original = jobs.find((j) => j.slug === match.slug);
      return {
        ...match,
        company: original?.company || "Unknown",
        title: original?.title || "Unknown",
        location: original?.location || "Unknown",
        url: original?.url || "#",
        tags: original?.tags || [],
        remote: original?.remote || false,
      };
    });

    return Response.json({ matches: enriched });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while matching jobs",
      },
      { status: 500 }
    );
  }
}
