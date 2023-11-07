import React from 'react';

function ErrorComponent(props) {
    const style = {
        color: 'red',
        fontWeight: 'bold'
    };


    return (
        <div style={style}>
            {props.text}
        </div>
    );
}

export default ErrorComponent;