module.exports = () => {
  const model = jest.fn(function(data) {
    Object.assign(this, data);
    this.id = "record-id";
    this.save = model.save;
  });
  for(const method of ["find", "findOne", "countDocuments", "updateOne", "updateMany", "deleteOne", "deleteMany", "save"]) {
    model[method] = jest.fn();
  }
  return model;
};
