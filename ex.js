document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('toggleButton');
    
    // 从 localStorage 加载按钮状态
    const buttonState = localStorage.getItem('buttonState');

    if (buttonState === 'active') {
        button.classList.add('active');
        button.classList.remove('inactive');
        button.textContent = 'Active';
    } else {
        button.classList.add('inactive');
        button.classList.remove('active');
        button.textContent = 'Inactive';
    }

    // 添加按钮点击事件监听器
    button.addEventListener('click', () => {
        if (button.classList.contains('inactive')) {
            button.classList.remove('inactive');
            button.classList.add('active');
            button.textContent = 'Active';
            localStorage.setItem('buttonState', 'active');
        } else {
            button.classList.remove('active');
            button.classList.add('inactive');
            button.textContent = 'Inactive';
            localStorage.setItem('buttonState', 'inactive');
        }
    });
});
