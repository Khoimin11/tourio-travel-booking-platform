module.exports = (totalRecord, req, limitItems = 9) => {
  const totalPage = Math.ceil(totalRecord / limitItems);
  const requestedPage = Number(req.query.page);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const currentPage = Math.min(page, totalPage || 1);
  const startPage = Math.max(1, Math.min(currentPage - 2, totalPage - 4));

  return {
    currentPage,
    totalPage,
    skip: (currentPage - 1) * limitItems,
    limitItems,
    startPage,
    endPage: Math.min(totalPage, startPage + 4),
    getPageLink: (targetPage) => {
      const query = new URLSearchParams(req.query);
      query.set("page", targetPage);
      return `${req.originalUrl.split("?")[0]}?${query}`;
    }
  };
};
