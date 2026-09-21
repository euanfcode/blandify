export default async function handler(request, response) {
  return response.status(200).json({
    text: "NEW BACKEND ACTIVE"
  });
}
