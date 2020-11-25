
const deleteProduct = (btn) => {
    const prodId = btn.parentNode.querySelector("[name=productId]").value;
    const csrf = btn.parentNode.querySelector("[name=_csrf]").value;

    const productElement = btn.closest("article");

    fetch("/admin/product/" + prodId, {
        method: "DELETE",
        headers: {
            "csrf-token": csrf,
        },
    })
        .then((result) => {
            console.log("from admin.js", result);
            return result.json();
        })
        .then((data) => {
            console.log('from result.json() admin.js', data);
            productElement.parentNode.removeChild(productElement); //supports internet explorer aswell
            //productElement.remove()  //doest support IE
        })
        .catch((err) => {
            console.log("from admin.js", err);
        });
};
