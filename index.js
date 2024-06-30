const functions = require("@google-cloud/functions-framework");
const dotenv = require("dotenv");
const express = require("express");
dotenv.config();

const ENV = require("./env.json");
const app = express();
app.use(express.json());

async function getQuestionsAlreadyAsk() {
  const response = await fetch(
    `https://api.telegram.org/bot${ENV.bot_token}/getUpdates`
  );
  const { result } = await response.json();
  return result.map((o) => o.poll?.question).filter(Boolean);
}

async function createTelegramPoll(
  botToken,
  chatId,
  question,
  options,
  correct_option_id
) {
  const url = `https://api.telegram.org/bot${botToken}/sendPoll`;
  const formData = new URLSearchParams();
  formData.append("chat_id", chatId);
  formData.append("question", question);
  formData.append("options", JSON.stringify(options));
  formData.append("type", "quiz");
  formData.append("correct_option_id", Number(correct_option_id));

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error("Error creating Telegram poll:", error);
  }
}

async function generateQuestionAndOptions() {
  const previousQuestions = await getQuestionsAlreadyAsk();

  const prompt = `
  Génère une question de sondage sur la programmation avec des options de réponse. 

  Le stack sera Javascript / HTML / CSS.

  Ta réponse doit être uniquement comme suit :

  {
    "question" : question,
    "options" = ["answer1", "answer2", "answer3", "answer4", "answer5"],
    "correct_option_id": "The index of the correct option"
  }

  La question doit être sur les fondamentaux du langage ainsi que des sujets intéressants moins connus.

  La question peut être aussi l'énoncé un problème à résoudre.

  La question ne doit jamais être identique à la précédente, ou sinon, fais en sorte de reformuler la question.

  Voici les questions qui ont déjà été posées : ${previousQuestions.join(", ")}

  Évite les 'var' en JS.

  Tu dois être comme un recruteur posant des questions.

  Les réponses doivent être brèves et concises.

  Il doit y avoir plusieurs choix de réponse possibles mais une seule réponse correcte.

  Les réponses doivent être au maximum 5 choix.

  Les questions doivent être spécifiques et non générales.

  Les réponses doivent être en français.

  Le tableau des options peut contenir de 2 à 5 options.

  La question doit toujours contenir un emoji.
  `;

  const apiUrl = "https://api.openai.com/v1/chat/completions";

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.open_ai_key}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: prompt,
          },
          {
            role: "user",
            content: "",
          },
        ],
        model: "gpt-4",
        max_tokens: 1000,
      }),
    });

    const responseData = await response.text();
    const data = JSON.parse(responseData);
    const generatedContent = data.choices[0].message.content.trim();

    const { question, options, correct_option_id } =
      JSON.parse(generatedContent);
    return { question, options, correct_option_id };
  } catch (error) {
    console.error(
      "Erreur lors de la génération de la question avec ChatGPT:",
      error
    );
    return { question: null, options: [] };
  }
}

app.get("/send-quizz", async (req, res) => {
  const { question, options, correct_option_id } =
    await generateQuestionAndOptions();

  if (question && options.length > 0) {
    await createTelegramPoll(
      ENV.bot_token,
      ENV.groups[0].id,
      question,
      options,
      correct_option_id
    );
    res.send({ question, options, correct_option_id });
  } else {
    console.log("Impossible de générer la question ou les options.");
    res.status(500).send("Erreur lors de la génération du quizz.");
  }
});

app.get("/create-quizz", async (req, res) => {
  try {
    const { question, options, correct_option_id } =
      await generateQuestionAndOptions();
    res.send({ question, options, correct_option_id });
  } catch (err) {
    console.log(err);
    res.status(500).send("Erreur lors de la génération du quizz.");
  }
});

functions.http("manageRoutes", app);
