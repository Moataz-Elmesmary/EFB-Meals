function newRequestTemplate(request){
  return `<h3>New Meal Request #${request.id}</h3>
  <p>From: ${request.requester_name} (${request.requester_email})</p>
  <p>Meal: ${request.name_en} / ${request.name_ar}</p>
  <p>Quantity: ${request.quantity}</p>
  <p>Special: ${request.special_request}</p>`;
}

function budgetCreatedTemplate(requestId){
  return `<h3>Budget Created for Request #${requestId}</h3>
  <p>Your request now has a budget and attachment. The kitchen may follow up.</p>`;
}

module.exports = { newRequestTemplate, budgetCreatedTemplate };
