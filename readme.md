# telegram-quizz

### To get group id

```
https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
```

### Endpoint

```
https://us-central1-likeme-2b112.cloudfunctions.net/generate-quizz
```

### How to deploy

```
gcloud functions deploy telegram-quizz \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=manageRoutes \
  --region=us-central1
```
