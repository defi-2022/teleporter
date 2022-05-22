import React from 'react'

const Modal = (props) => {
  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen w-screen px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <div
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
          ref={props.modalRef}
        >
          <div className="px-4 pt-2">{props.sourceChain ? "Source chain:" : "Destination chain:"}</div>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {props.options.map((option) => {
              return (
                <div className="rounded-lg bg-slate-200 hover:bg-slate-300 py-2 my-1 justify-center align-center text-center w-full cursor-pointer" onClick={()=>{props.callback(option.id)}}>
                  {option.name}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Modal
