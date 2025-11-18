import { config } from "dotenv";

// Load environment variables FIRST before importing db
config({ path: ".env" });

import { db } from "./index";
import {
  position,
  roundTemplate,
  questionBank,
  roundTemplateQuestions,
  positionRoundTemplates,
} from "./schema";

async function seed() {
  console.log("🌱 Seeding database...");

  // Create Positions
  const positions = [
    {
      name: "Frontend Developer",
      slug: "frontend-developer",
      description:
        "Build responsive and performant user interfaces using modern JavaScript frameworks",
    },
    {
      name: "Backend Developer",
      slug: "backend-developer",
      description:
        "Design and implement scalable server-side applications and APIs",
    },
    {
      name: "Fullstack Developer",
      slug: "fullstack-developer",
      description:
        "Work across the entire stack, from database to user interface",
    },
    {
      name: "HR Assistant",
      slug: "hr-assistant",
      description:
        "Support HR operations including recruitment, onboarding, and employee relations",
    },
    {
      name: "DevOps Engineer",
      slug: "devops-engineer",
      description:
        "Manage infrastructure, CI/CD pipelines, and deployment automation",
    },
  ];

  const insertedPositions = await db
    .insert(position)
    .values(positions)
    .returning();

  console.log(`✅ Created ${insertedPositions.length} positions`);

  // Create Round Templates
  const roundTemplates = [
    { name: "Screening", description: "Initial screening round" },
    { name: "Technical", description: "Technical assessment round" },
    {
      name: "Final Executive",
      description: "Final interview with leadership",
    },
  ];

  const insertedRounds = await db
    .insert(roundTemplate)
    .values(roundTemplates)
    .returning();

  console.log(`✅ Created ${insertedRounds.length} round templates`);

  // Create Question Bank
  const questions = [
    // Frontend Questions
    {
      questionText: "Explain the virtual DOM and how React uses it for performance optimization",
      questionType: "technical",
    },
    {
      questionText: "What are the differences between useState and useRef in React?",
      questionType: "technical",
    },
    {
      questionText: "How would you optimize a slow-rendering React component? Walk us through your debugging process.",
      questionType: "technical",
    },
    {
      questionText: "Explain CSS specificity and how you would handle conflicting styles",
      questionType: "technical",
    },
    {
      questionText: "What is the difference between localStorage and sessionStorage?",
      questionType: "technical",
    },

    // Backend Questions
    {
      questionText: "Explain the difference between SQL and NoSQL databases and when to use each",
      questionType: "technical",
    },
    {
      questionText: "How would you design a RESTful API for a multi-tenant application?",
      questionType: "technical",
    },
    {
      questionText: "What is database indexing and how does it improve query performance?",
      questionType: "technical",
    },
    {
      questionText: "Explain the concept of ACID properties in database transactions",
      questionType: "technical",
    },
    {
      questionText: "How would you handle race conditions in a distributed system?",
      questionType: "technical",
    },

    // Fullstack Questions
    {
      questionText: "Walk us through how you would architect a real-time chat application from scratch",
      questionType: "technical",
    },
    {
      questionText: "Explain authentication vs authorization and how you would implement both",
      questionType: "technical",
    },
    {
      questionText: "How do you handle state management in a large-scale application?",
      questionType: "technical",
    },

    // HR Questions
    {
      questionText: "Why are you interested in this role?",
      questionType: "behavioral",
    },
    {
      questionText: "Tell us about your experience with recruitment processes",
      questionType: "behavioral",
    },
    {
      questionText: "How do you handle confidential employee information?",
      questionType: "behavioral",
    },
    {
      questionText: "Describe a time when you had to handle a difficult employee situation",
      questionType: "behavioral",
    },

    // DevOps Questions
    {
      questionText: "Explain the differences between Docker and Kubernetes",
      questionType: "technical",
    },
    {
      questionText: "How would you set up a CI/CD pipeline for a microservices architecture?",
      questionType: "technical",
    },
    {
      questionText: "What is Infrastructure as Code and what tools have you used for it?",
      questionType: "technical",
    },
    {
      questionText: "How do you monitor and troubleshoot production applications?",
      questionType: "technical",
    },

    // General Screening Questions
    {
      questionText: "Tell us about your background and experience",
      questionType: "screening",
    },
    {
      questionText: "What are your salary expectations?",
      questionType: "screening",
    },
    {
      questionText: "When can you start?",
      questionType: "screening",
    },
    {
      questionText: "Why do you want to work for our company?",
      questionType: "screening",
    },

    // General Behavioral Questions
    {
      questionText: "Tell me about a challenging project you worked on and how you overcame obstacles",
      questionType: "behavioral",
    },
    {
      questionText: "How do you handle conflict in a team?",
      questionType: "behavioral",
    },
    {
      questionText: "Describe your ideal work environment",
      questionType: "behavioral",
    },
    {
      questionText: "What are your long-term career goals?",
      questionType: "behavioral",
    },
    {
      questionText: "Do you have any questions for us?",
      questionType: "behavioral",
    },
  ];

  const insertedQuestions = await db
    .insert(questionBank)
    .values(questions)
    .returning();

  console.log(`✅ Created ${insertedQuestions.length} questions`);

  // Link questions to rounds
  const screeningRound = insertedRounds.find((r) => r.name === "Screening")!;
  const technicalRound = insertedRounds.find((r) => r.name === "Technical")!;
  const finalRound = insertedRounds.find(
    (r) => r.name === "Final Executive"
  )!;

  // Screening round questions (general for all positions)
  const screeningQuestions = insertedQuestions.filter(
    (q) => q.questionType === "screening"
  );

  for (const q of screeningQuestions) {
    await db.insert(roundTemplateQuestions).values({
      roundTemplateId: screeningRound.id,
      questionId: q.id,
    });
  }

  // Technical round questions for technical roles
  const frontendQuestions = insertedQuestions.slice(0, 5); // First 5 are frontend
  const backendQuestions = insertedQuestions.slice(5, 10); // Next 5 are backend
  const fullstackQuestions = insertedQuestions.slice(10, 13); // Next 3 are fullstack
  const devopsQuestions = insertedQuestions.slice(17, 21); // DevOps questions

  // Frontend Developer
  const frontendPos = insertedPositions.find(
    (p) => p.name === "Frontend Developer"
  )!;
  await db.insert(positionRoundTemplates).values([
    { positionId: frontendPos.id, roundTemplateId: screeningRound.id, stageOrder: 1 },
    { positionId: frontendPos.id, roundTemplateId: technicalRound.id, stageOrder: 2 },
    { positionId: frontendPos.id, roundTemplateId: finalRound.id, stageOrder: 3 },
  ]);

  for (const q of frontendQuestions) {
    await db.insert(roundTemplateQuestions).values({
      roundTemplateId: technicalRound.id,
      questionId: q.id,
    });
  }

  // Backend Developer
  const backendPos = insertedPositions.find(
    (p) => p.name === "Backend Developer"
  )!;
  await db.insert(positionRoundTemplates).values([
    { positionId: backendPos.id, roundTemplateId: screeningRound.id, stageOrder: 1 },
    { positionId: backendPos.id, roundTemplateId: technicalRound.id, stageOrder: 2 },
    { positionId: backendPos.id, roundTemplateId: finalRound.id, stageOrder: 3 },
  ]);

  for (const q of backendQuestions) {
    await db.insert(roundTemplateQuestions).values({
      roundTemplateId: technicalRound.id,
      questionId: q.id,
    });
  }

  // Fullstack Developer
  const fullstackPos = insertedPositions.find(
    (p) => p.name === "Fullstack Developer"
  )!;
  await db.insert(positionRoundTemplates).values([
    { positionId: fullstackPos.id, roundTemplateId: screeningRound.id, stageOrder: 1 },
    { positionId: fullstackPos.id, roundTemplateId: technicalRound.id, stageOrder: 2 },
    { positionId: fullstackPos.id, roundTemplateId: finalRound.id, stageOrder: 3 },
  ]);

  for (const q of fullstackQuestions) {
    await db.insert(roundTemplateQuestions).values({
      roundTemplateId: technicalRound.id,
      questionId: q.id,
    });
  }

  // DevOps Engineer
  const devopsPos = insertedPositions.find(
    (p) => p.name === "DevOps Engineer"
  )!;
  await db.insert(positionRoundTemplates).values([
    { positionId: devopsPos.id, roundTemplateId: screeningRound.id, stageOrder: 1 },
    { positionId: devopsPos.id, roundTemplateId: technicalRound.id, stageOrder: 2 },
    { positionId: devopsPos.id, roundTemplateId: finalRound.id, stageOrder: 3 },
  ]);

  for (const q of devopsQuestions) {
    await db.insert(roundTemplateQuestions).values({
      roundTemplateId: technicalRound.id,
      questionId: q.id,
    });
  }

  // HR Assistant (behavioral questions)
  const hrPos = insertedPositions.find((p) => p.name === "HR Assistant")!;
  await db.insert(positionRoundTemplates).values([
    { positionId: hrPos.id, roundTemplateId: screeningRound.id, stageOrder: 1 },
    { positionId: hrPos.id, roundTemplateId: technicalRound.id, stageOrder: 2 },
    { positionId: hrPos.id, roundTemplateId: finalRound.id, stageOrder: 3 },
  ]);

  const hrQuestions = insertedQuestions.filter(
    (q) => q.questionType === "behavioral"
  ).slice(0, 4); // First 4 HR-specific questions

  for (const q of hrQuestions) {
    await db.insert(roundTemplateQuestions).values({
      roundTemplateId: technicalRound.id,
      questionId: q.id,
    });
  }

  // Final round questions (behavioral - same for all)
  const behavioralQuestions = insertedQuestions.filter(
    (q) => q.questionType === "behavioral"
  ).slice(-5); // Last 5 behavioral questions

  for (const q of behavioralQuestions) {
    await db.insert(roundTemplateQuestions).values({
      roundTemplateId: finalRound.id,
      questionId: q.id,
    });
  }

  console.log("✅ Linked questions to rounds");
  console.log("✅ Linked positions to rounds");
  console.log("🎉 Database seeded successfully!");
}

seed()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
