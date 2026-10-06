// Display dates consistently while preserving ISO values for forms and filters.
if(typeof flatpickr !== "undefined") {
  document.querySelectorAll('input[type="date"], input[type="datetime-local"]').forEach(input => {
    const withTime = input.type === "datetime-local";
    input.placeholder = withTime ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY";
    flatpickr(input, {
      locale: "vn",
      dateFormat: withTime ? "Y-m-d\\TH:i" : "Y-m-d",
      altInput: true,
      altFormat: withTime ? "d/m/Y H:i" : "d/m/Y",
      altInputClass: "date-picker-input",
      enableTime: withTime,
      time_24hr: true,
      disableMobile: true,
      allowInput: !input.readOnly,
      clickOpens: !input.readOnly,
      onReady: (dates, value, instance) => {
        if(!input.id) return;
        const label = document.querySelector(`label[for="${input.id}"]`);
        instance.altInput.id = `${input.id}-display`;
        if(label) label.htmlFor = instance.altInput.id;
      }
    });
  });
}
