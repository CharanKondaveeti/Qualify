const useFullscreen = () => {
  const enterFullscreen = () => {
    const el = document.documentElement;

    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen(); // Safari
    } else if (el.msRequestFullscreen) {
      el.msRequestFullscreen(); // IE11
    }
  };

  return enterFullscreen;
};

export default useFullscreen;
