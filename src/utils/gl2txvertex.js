
const vertexShader = `#version 300 es

in vec2 a_texCoord;
in vec4 vPosition;
out vec2 v_texcoord;

void main() {
	gl_Position = vPosition;

  v_texcoord = a_texCoord;
}
`;
export default vertexShader;
