var popUpBox;
var button;
var instructionImage;
var frontBlurb;
function show(e){
    e.style.display = "unset";

        e.style.opacity = 1;

}
function hide(e){
    e.style.opacity = 0;
}
function init(){
    popUpBox = document.querySelector("#csfxPopUp");
    button = document.querySelector("#nxt");
    instructionImage = [
        document.querySelector("#inst0"),
        document.querySelector("#inst1"),
        document.querySelector("#inst2")
    ];
    instructionText = [
        document.querySelector(".it0"),
        document.querySelector(".it1"),
        document.querySelector(".it2")
    ];
    frontBlurb = document.querySelector("#frontText");
}
function popUp(){
    show(popUpBox);

    button.addEventListener("click",function(){
        popUpBox.classList.add("full");
        hide(button);
        frontBlurb.classList.add("ftDown");
        setTimeout(function(){
            show(instructionImage[0]);
            show(instructionText[0]);
        },750)
        setTimeout(function(){
            show(instructionImage[1]);
            show(instructionText[1]);
        },1000)
        setTimeout(function(){
            show(instructionImage[2]);
            show(instructionText[2]);
        },1250)

    });
}
function newTab(url){
    var tab = window.open(url, '_blank');
    tab.focus();
}
function closePopUp(){
    hide(popUpBox);
    setTimeout(function(){
        popUpBox.outerHTML = "";
    }, 1000);
}
document.addEventListener("DOMContentLoaded", init);
