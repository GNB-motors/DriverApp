export function isDefinitiveRejection(error) {
  const processing =
    /processing|needs recovery|retry this same submission/i.test(
      error.message || "",
    );
  return (
    [400, 403, 404, 422].includes(error.response?.status) ||
    (error.response?.status === 409 && !processing)
  );
}
