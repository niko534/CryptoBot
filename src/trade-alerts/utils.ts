export const formatArgs = (args?: any[]): string => {
    if (!args) {
        return ''
    }
    return args?.reduce((resultMessage: string, curr: any) => {
        return `${resultMessage} ${typeof curr === 'object' ? JSON.stringify(curr) : curr}`
    }, '')
}