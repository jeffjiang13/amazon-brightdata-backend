import * as functions from "firebase-functions";
import { adminDb } from "./firebaseAdmin";
import * as admin from "firebase-admin";

const fetchResults: any = async (id: string) => {
  const api_key = process.env.FIREBASE_API_KEY;

  const res = await fetch(`https://api.brightdata.com/dca/dataset?id=${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${api_key}`,
    },
  });

  const data = await res.json();

  console.log("DEBUG 1 GATE >>>", data.status);
  if (data.status === "building" || data.status === "collecting") {
    console.log("NOT COMPLETE YET, TRYING AGAIN IN 5 SECONDS");
    return fetchResults(id);
  }

  console.log("DEBUG 2 ><><>");

  return data;
};

export const onScraperComplete = functions.https.onRequest(
  async (request, response) => {
    console.log("SCRAPE COMPLETE >>> : ", request.body);
    const { success, id } = request.body;

    if (!success) {
      await adminDb.collection("searches").doc(id).set(
        {
          status: "error",
          updatedAt: admin.firestore.Timestamp.now(),
        },
        { merge: true }
      );
      response.set(500).send("Error while scraping");
    }

    const data = await fetchResults(id);

    await adminDb.collection("searches").doc(id).set(
      {
        status: "complete",
        updatedAt: admin.firestore.Timestamp.now(),
        results: data,
      },
      {
        merge: true,
      }
    );

    console.log("<><><><><>< FULL CIRCLE ><><><><><><>");

    response.send("Hello from Firebase!");
  }
);
